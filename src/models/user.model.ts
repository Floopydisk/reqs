import { createPgModel } from "../db/pgModel";
import { IUser } from "../types/interfaces";
import bcrypt from "bcryptjs";

const BaseUser = createPgModel<IUser>("users");

function attachUserMethods(doc: any) {
  if (!doc) return;
  doc.comparePassword = async function (enteredPassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(enteredPassword, this.password);
  };
  doc.matchPassword = doc.comparePassword;
}

const User: any = {
  ...BaseUser,

  async create(data: any) {
    if (data.password && !data.password.startsWith("$2")) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }
    const doc = await BaseUser.create(data);
    attachUserMethods(doc);
    return doc;
  },

  find(filter: any = {}) {
    const chain = BaseUser.find(filter);
    const origThen = chain.then.bind(chain);
    chain.then = (onfulfilled?: any, onrejected?: any) => {
      return origThen((res: any) => {
        if (Array.isArray(res)) {
          res.forEach(attachUserMethods);
        }
        return onfulfilled ? onfulfilled(res) : res;
      }, onrejected);
    };
    return chain;
  },

  findById(id: any) {
    const chain = BaseUser.findById(id);
    const origThen = chain.then.bind(chain);
    chain.then = (onfulfilled?: any, onrejected?: any) => {
      return origThen((res: any) => {
        if (res) attachUserMethods(res);
        return onfulfilled ? onfulfilled(res) : res;
      }, onrejected);
    };
    return chain;
  },

  findOne(filter: any = {}) {
    const chain = BaseUser.findOne(filter);
    const origThen = chain.then.bind(chain);
    chain.then = (onfulfilled?: any, onrejected?: any) => {
      return origThen((res: any) => {
        if (res) attachUserMethods(res);
        return onfulfilled ? onfulfilled(res) : res;
      }, onrejected);
    };
    return chain;
  },

  async findByIdAndUpdate(id: any, update: any, options: any = {}) {
    const updates = update?.$set || update || {};
    if (updates.password && !updates.password.startsWith("$2")) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }
    const doc = await BaseUser.findByIdAndUpdate(id, update, options);
    if (doc) attachUserMethods(doc);
    return doc;
  },
};

export default User;
