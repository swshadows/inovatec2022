const bcrypt = require("bcrypt");
const User = require("../models/User");
const Ads = require("../models/Ad");

module.exports = {
  async listAllUsers(req, res) {
    const users = await User.findAll();
    return res.json(users);
  },

  async registerUser(req, res) {
    if (req.body.password != req.body.password_confirm) {
      req.session.message = { class: "danger", text: "ERRO: As senhas não são iguais" };
      return res.redirect("/forms");
    }

    const findEmail = await User.findOne({ where: { email: req.body.email } });
    if (findEmail) {
      req.session.message = { class: "danger", text: "ERRO: Este email já está registrado no banco de dados" };
      return res.redirect("/forms");
    }

    const findPhone = await User.findOne({ where: { phone: req.body.phone } });
    if (findPhone) {
      req.session.message = { class: "danger", text: "ERRO: Este telefone já está registrado no banco de dados" };
      return res.redirect("/forms");
    }

    const users = await User.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: await bcrypt.hash(req.body.password, 10),
      fk_address: req.body.address,
    });
    req.session.message = { class: "success", text: "Conta registrada com sucesso, faça login!" };
    return res.redirect("/forms");
  },

  async deleteUser(req, res) {
    const user = await User.findOne({ where: { email: req.session.email } });
    const ads = Ads.destroy({
      where: { fk_user: user.id },
    });
    user.destroy();

    req.session.logged = false;
    req.session.message = { class: "success", text: "A conta e todos os anuncios foram apagados com sucesso" };
    res.redirect("/");
  },

  async updateUser(req, res) {
    const findUser = await User.findOne({ where: { email: req.session.email } });
    if (!(await bcrypt.compare(req.body.password, findUser.password))) {
      req.session.message = { class: "danger", text: "ERRO: Credenciais incorretas" };
      return res.redirect("/me/update");
    }

    if (req.body.new_password != req.body.new_password_confirm) {
      req.session.message = { class: "danger", text: "ERRO: As senhas não são iguais" };
      return res.redirect("/me/update");
    }

    let checkConflict = await User.findOne({ where: { phone: req.body.phone } });
    if (checkConflict && findUser.phone != checkConflict.phone) {
      req.session.message = { class: "danger", text: "ERRO: Este telefone já está em uso" };
      return res.redirect("/me/update");
    }

    checkConflict = await User.findOne({ where: { email: req.body.email } });
    if (checkConflict && findUser.email != checkConflict.email) {
      req.session.message = { class: "danger", text: "ERRO: Este email já está em uso" };
      return res.redirect("/me/update");
    }

    const user = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      password: await bcrypt.hash(req.body.new_password, 10),
    };

    await User.update(user, { where: { email: req.session.email } });
    req.session.email = user.email;
    req.session.message = { class: "success", text: "Informações atualizadas com sucesso" };
    res.redirect("/me/update");
  },

  async authenticateUser(req, res) {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) {
      req.session.message = { class: "danger", text: "ERRO: Usuário não encontrado" };
      return res.redirect("/forms");
    }

    if (await bcrypt.compare(req.body.password, user.password)) {
      req.session.logged = true;
      req.session.email = user.email;
      res.redirect("/app");
    } else {
      req.session.message = { class: "danger", text: "ERRO: Credenciais incorretas" };
      return res.redirect("/forms");
    }
  },
};
