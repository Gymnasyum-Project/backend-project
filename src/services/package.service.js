const AppError = require('../utils/AppError')
const prisma = require('../config/prisma')

exports.list = ()=>prisma.packages.findMany({
    orderBy:{name:'asc'}
})

exports.createPackage = (data)=>prisma.packages.create({data})

exports.assignToCustomer = async({customer_id, package_id, start_date})=>{
    const pkg = await prisma.packages.findUnique({where:{id:package_id}});
    if(!pkg)throw new AppError(404, 'Not Found', 'Master Paket Tidak Ditemukan')

        const endDate = new Date(start_date);
        endDate.setDate(endDate.getDate() + pkg.duration_days)

        return prisma.customer_packages.create({
            data:{
                customer_id,
                package_id,
                start_date: new Date(start_date),
                end_date: endDate,
                total_sessions: pkg.total_sessions,
                remaining_sessions: pkg.total_sessions,
                status:'active',
            }
        })
}
exports.getCustomerPackage = async(id)=>{
    const result = await prisma.customer_packages.findUnique({
        where: {id},
        include:{packages: true, customers: true}
    });
    if(!result) throw new AppError(404, 'Not Found', 'Package Customer Tidak Ditemukan');
    return result
}

exports.getPackageById = async(id)=>{
    const result = await prisma.packages.findUnique({where: {id}})
    if(!result) throw new AppError(404, 'Not Found', 'Package Customer Tidak Ditemukan')
    return result
}

exports.listCustomerPackages = () =>
  prisma.customer_packages.findMany({
    include: { customers: true, packages: true },
    orderBy: { start_date: 'desc' },
  });

exports.updateCustomerPackage = async (id, data) => {
  const existing = await prisma.customer_packages.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Package Customer Tidak Ditemukan');

  const result = await prisma.customer_packages.update({
    where: { id },
    data,
  });
  return result;
};