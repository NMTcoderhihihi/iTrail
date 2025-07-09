// app/api/schedule/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

import connectToDatabase from '@/config/connectDB';
import '@/models/users';
import ZaloAccount from '@/models/zalo';
import Customer from '@/models/client';
import ScheduledJob from '@/models/tasks';
import authenticate from '@/utils/authenticate';
import { Re_acc, Re_user } from '@/data/users';
import { revalidateTag } from 'next/cache';

// ---------- hằng số ----------
const MIN_GAP_MS = 20_000;  // 20 s
const LIMIT_PER_HR = 50;     // mặc định 50 hành động / giờ

// ---------- helper ----------
function randomTimes(start, end, count, minGapMs) {
    const arr = [];
    let last = null;

    for (let i = 0; i < count; i++) {
        const earliest = last ? new Date(last.getTime() + minGapMs) : new Date(start);
        const latest = new Date(end.getTime() - (count - i - 1) * minGapMs);

        if (earliest > latest) throw new Error('Không đủ khoảng trống để xếp lịch; thử giảm giới hạn.');

        const ms = earliest.getTime() + Math.floor(Math.random() * (latest - earliest));
        last = new Date(ms);
        arr.push(last);
    }
    return arr;
}

function schedulePersons(personIds, startDate = new Date(), limitPerHour = LIMIT_PER_HR, minGapMs = MIN_GAP_MS) {
    const result = [];
    let idx = 0;
    let last = null;
    let winStart = new Date(startDate);

    while (idx < personIds.length) {
        const winEnd = new Date(winStart);
        winEnd.setHours(winEnd.getHours() + 1, 0, 0, 0);

        const effectiveStart = last
            ? new Date(Math.max(winStart.getTime(), last.getTime() + minGapMs))
            : winStart;

        let remainingMs = winEnd - effectiveStart;
        if (remainingMs <= 0) { winStart = winEnd; continue; }

        let capacity = Math.floor(limitPerHour * (remainingMs / 3_600_000));        // quota theo giờ
        capacity = Math.min(
            capacity,
            Math.floor(remainingMs / minGapMs),                                        // quota theo gap
            personIds.length - idx                                                     // còn bao nhiêu người
        );
        if (capacity <= 0) { winStart = winEnd; continue; }

        const times = randomTimes(effectiveStart, winEnd, capacity, minGapMs);
        times.forEach(t => {
            result.push({ person: personIds[idx++], scheduledFor: t, status: 'pending' });
            last = t;
        });

        winStart = winEnd;
    }
    return result;
}

// ---------- POST handler ----------
export async function POST(request) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        await connectToDatabase();
        const { user, body } = await authenticate(request);

        if (!user) {
            return NextResponse.json({ status: 1, mes: 'Xác thực không thành công.' }, { status: 401 });
        }

        const { jobName, actionType, config = {}, zaloAccountId, tasks } = body;
        if (!zaloAccountId || !Array.isArray(tasks) || tasks.length === 0 || !actionType) {
            return NextResponse.json({ status: 1, mes: 'Thiếu dữ liệu: zaloAccountId, tasks, actionType.' }, { status: 400 });
        }

        // Kiểm tra job trùng
        const dup = await ScheduledJob.findOne({
            zaloAccount: zaloAccountId,
            actionType,
            status: { $in: ['pending', 'processing'] }
        }).lean();
        if (dup) {
            return NextResponse.json({ status: 1, mes: `Tài khoản đã có lịch ${actionType} đang chạy.` }, { status: 409 });
        }

        // Lấy bot
        const account = await ZaloAccount.findById(zaloAccountId).session(session);
        if (!account) {
            return NextResponse.json({ status: 1, mes: 'Không tìm thấy tài khoản.' }, { status: 404 });
        }

        // Tính lịch
        const personIds = tasks.map(t => t.person);
        const scheduledTasks = schedulePersons(
            personIds,
            new Date(),
            config.actionsPerHour || account.rateLimitPerHour,
            MIN_GAP_MS
        );

        // Tạo ScheduledJob
        const [newJob] = await ScheduledJob.create([{
            jobName: jobName || `Lịch ${actionType} cho ${tasks.length} người`,
            status: 'processing',
            actionType,
            zaloAccount: zaloAccountId,
            tasks: scheduledTasks,
            config,
            statistics: { total: tasks.length, completed: 0, failed: 0 },
            estimatedCompletionTime: scheduledTasks.at(-1).scheduledFor,
            createdBy: user.id
        }], { session });

        await ZaloAccount.findByIdAndUpdate(
            zaloAccountId,
            { $addToSet: { task: { id: newJob._id, actionType } } },
            { session }
        )
        await Customer.updateMany(
            { _id: { $in: personIds } },
            { $push: { action: { job: newJob._id, zaloAccount: zaloAccountId, actionType, status: 'pending' } } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        revalidateTag('customer_data');
        Re_acc(); Re_user();
        return NextResponse.json({ status: 2, mes: 'Đặt lịch thành công!', data: newJob });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
        return NextResponse.json({ status: 0, mes: 'Lỗi khi tạo lịch.', data: err.message }, { status: 500 });
    }
}
