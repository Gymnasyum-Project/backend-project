const service = require('../services/attendance.service')
const {ok, created} = require('../utils/response')

exports.list = async(req, res)=> ok(res, await service.list(req.validate.query.customer_id))

exports.created = async(req, res, next)=> {
    try{
        const payload = req.validate?.body || req.body;
        if(!payload){
            return res.status(400).json({status: 'fail', message:'Data Validasi Tidak ditemukan'})
        }

        const result = await service.create(payload)
        return created(res, result)
    }catch(error){
        next(error)
    }
}
exports.updateStatus = async(req, res) => ok(res, await service.updateStatus(req.validate.params.id, req.validate.body))

exports.reschedule = async(req, res)=> {
    console.log(req.validate.body)
    ok(res, await service.reschedules(req.validate.params.id, req.validate.body))}