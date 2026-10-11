const service = require('../services/attendance.service')
const {ok, created} = require('../utils/response')

exports.list = async(req, res)=> ok(res, await service.list(req.validated.query.customer_id))

exports.created = async(req, res)=> created(res, await service.create(req.validated.body))

exports.updateStatus = async(req, res) => ok(res, await service.updateStatus(req.validated.params.id, req.validated.body))

exports.reschedule = async(req, res)=> ok(res, await service.reschedules(req.validated.params.id, req.validated.body))