const service = require('../services/auth.service');
const { ok } = require('../utils/response');

exports.login = async (req, res) => {
        const { email, password } = req.validated?.body || req.body;
        const result = await service.login(email, password);
        ok(res, result);
};

exports.me = async (req, res) => {
  const result = await service.getProfile(req.user.id);
  ok(res, result);
};

exports.logout = async(req, res, next)=>{
    try{
        res.clearCookie('token',{
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        return res.status(200).json({
            status: "success",
            message: "logout berhasil",
        });
    }catch(error){
        next(error)
    }
}