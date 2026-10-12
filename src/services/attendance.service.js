const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

exports.list = (customerId)=>prisma.attendance.findMany({
    where:{customer_id: customerId},
    orderBy: {scheduled_at: 'desc'}
})

exports.create = (data)=>prisma.attendance.create({data});

exports.updateStatus = async(id, {status, checkin_at})=>{
    const exiting = await prisma.attendance.findUnique({where: {id}});

    if(!exiting)throw new AppError(404, 'Not Found', 'Jadwal Attandance tidak ditemukan')

    return prisma.attendance.update({
        where: {id},
        data: {status, ...(checkin_at && {checkin_at})},
    });
};

exports.reschedules = async(attendanceId,{new_schedule, reason})=>{
    const attendance = await prisma.attendance.findUnique({where: {id: attendanceId}})
    if(!attendance)throw new AppError(404, 'Not Found', 'Jadwal Attandance tidak ditemukan')

    await prisma.reschedules.create({
        data:{
            attendance_id:attendanceId,
            old_schedule:attendance.scheduled_at,
            new_schedule,
            reason,
            requested_at: new Date()
        }
    })
    return prisma.attendance.update({
        where: {id:attendanceId},
        data:  {status: 'rescheduled', scheduled_at: new_schedule},
    })
}