import { NextResponse } from 'next/server';
import connectToDatabase from '@/config/connectDB';
import ScheduledJob from '@/models/tasks';
import ZaloAccount from '@/models/zalo';
import SendHistory from '@/models/SendHistory'; // Import model lịch sử
import { Re_acc, Re_user } from '@/data/users';

async function executeActionViaAppsScript(actionType, zaloAccount, person, config) {
    const payload = {
        uid: zaloAccount.uid,
        phone: person.phone,
        actionType: actionType,
        message: config.messageTemplate || ''
    };

    const response = await fetch('https://script.google.com/macros/s/AKfycbx0mC-ydmKZvQ8L2rsSgDaNhqCg-JzFs4NHyldMLfpQJmRhtn8dJBqw5gmX_iz1f7QBTQ/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        cache: 'no-store'
    });

    const result = await response.json();

    if (!response.ok || result.status === 'error') {
        throw new Error(result.message || 'Lỗi không xác định từ Apps Script.');
    }

    // Trả về toàn bộ data để có thể ghi log chi tiết
    return {
        success: result.data?.status === 'success',
        message: result.data?.details || 'Không có chi tiết.'
    };
}

export async function GET(request) {
    try {
        await connectToDatabase();
        const now = new Date();
        const dueTasks = await ScheduledJob.aggregate([
            { $match: { status: 'processing' } },
            { $unwind: '$tasks' },
            { $match: { 'tasks.status': 'pending', 'tasks.scheduledFor': { $lte: now } } },
            { $lookup: { from: 'zaloaccounts', localField: 'zaloAccount', foreignField: '_id', as: 'zaloAccountInfo' } },
            { $unwind: '$zaloAccountInfo' }
        ]);

        if (dueTasks.length === 0) {
            return NextResponse.json({ message: 'Không có tác vụ nào đến hạn.' });
        }

        let processedCount = 0;

        for (const taskData of dueTasks) {
            const { zaloAccountInfo: zaloAccount, tasks: task, _id: jobId, createdBy, jobName, actionType, config } = taskData;

            const currentZaloAccount = await ZaloAccount.findById(zaloAccount._id);
            if (!currentZaloAccount || currentZaloAccount.actionsUsedThisHour >= currentZaloAccount.rateLimitPerHour) {
                continue;
            }

            let result;
            try {
                result = await executeActionViaAppsScript(actionType, zaloAccount, task.person, config);
            } catch (apiError) {
                result = { success: false, message: apiError.message };
            }

            const newStatus = result.success ? 'completed' : 'failed';

            // Cập nhật Job và ZaloAccount
            const updateJobPromise = ScheduledJob.updateOne(
                { _id: jobId, 'tasks._id': task._id },
                {
                    $set: {
                        'tasks.$.status': newStatus,
                        'tasks.$.resultMessage': result.message,
                        'tasks.$.processedAt': new Date(),
                    },
                    $inc: {
                        [result.success ? 'statistics.completed' : 'statistics.failed']: 1,
                    }
                }
            );
            const updateZaloPromise = ZaloAccount.findByIdAndUpdate(zaloAccount._id, { $inc: { actionsUsedThisHour: 1 } });

            // --- LOGIC MỚI: GHI LỊCH SỬ ---
            const historyLogPromise = SendHistory.findOneAndUpdate(
                { jobId: jobId },
                {
                    $push: {
                        recipients: {
                            phone: task.person.phone,
                            name: task.person.name,
                            status: result.success ? 'success' : 'failed',
                            details: result.message
                        }
                    },
                    $setOnInsert: { // Chỉ set các trường này khi tạo mới document
                        jobId: jobId,
                        jobName: jobName,
                        actionType: actionType,
                        sentBy: createdBy,
                        message: config.messageTemplate || ''
                    }
                },
                { upsert: true, new: true } // Tạo mới nếu chưa có, và trả về document mới
            );

            await Promise.all([updateJobPromise, updateZaloPromise, historyLogPromise]);
            processedCount++;

            // Kiểm tra và kết thúc lịch trình nếu cần
            const updatedJob = await ScheduledJob.findById(jobId);
            if (updatedJob) {
                const { completed, failed, total } = updatedJob.statistics;
                if (completed + failed >= total) {
                    await finalizeJob(jobId, zaloAccount._id);
                }
            }
        }

        if (processedCount > 0) {
            Re_user();
            Re_acc();
        }

        return NextResponse.json({ message: `Cron job đã chạy. Đã xử lý ${processedCount} tác vụ.` });

    } catch (error) {
        return NextResponse.json(
            { message: 'Lỗi trong quá trình xử lý cron job.', error: error.message },
            { status: 500 }
        );
    }
}

async function finalizeJob(jobId, zaloAccountId) {
    await ScheduledJob.findByIdAndUpdate(jobId, {
        $set: { status: 'completed', completedAt: new Date() }
    });
    await ZaloAccount.findByIdAndUpdate(zaloAccountId, {
        $set: { isLocked: false, task: null }
    });
}