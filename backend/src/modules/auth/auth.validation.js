const Joi = require('joi');

const signUpSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().lowercase().email().max(254).required(),
    password: Joi.string().min(8).max(72).required(),
    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required(),
}).unknown(false);

const signInSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().max(254).required(),
    password: Joi.string().min(1).max(72).required(),
}).unknown(false);

const forgotPasswordSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().max(254).required(),
}).unknown(false);

const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).max(72).required(),
    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required(),
}).unknown(false);

const updateProfileSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100),
    email: Joi.string().trim().lowercase().email().max(254),
})
    .min(1)
    .unknown(false);

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().min(1).max(72).required(),
    newPassword: Joi.string().min(8).max(72).required(),
    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required(),
}).unknown(false);

module.exports = {
    signUpSchema,
    signInSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
    changePasswordSchema,
};