const aiSummaryService = require('../services/aiSummary.service')
const {ok, created} = require('../utils/response')

exports.generate = async(req, res, next)=>{
    try{const {customerId} = req.validate.params;
        const {regenerate} = req.validate.body;
        
        const summary = await aiSummaryService.generate(customerId, req.user.id, {regenerate})
        created(res, summary)
    }catch(err){
        next(err)
    }
}

exports.update = async(req, res, next)=>{
    try{
        const {id} = req.validate.params;
        const summary = await aiSummaryService.updateSummary(id, req.validate.body)
        ok(res, summary)
    }catch(err){
        next(err)
    }
}