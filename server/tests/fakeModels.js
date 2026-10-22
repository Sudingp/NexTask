/**
 * In-memory stand-ins for the Mongoose User and Task models, so the API tests
 * run anywhere with no MongoDB server. Each fake document is a real Mongoose
 * document (built from the real schema), so schema rules such as required
 * fields, type casting and unknown-field stripping behave exactly as in
 * production. Only storage is faked.
 */
const mongoose = require("mongoose");

function makeFakeModel(RealModel) {
  let rows = [];

  const matches = (doc, filter) =>
    Object.entries(filter).every(([k, v]) => String(doc.get(k)) === String(v));

  function wrap(doc) {
    // Persist on save, after running the real schema validation.
    doc.save = async function save() {
      const err = this.validateSync();
      if (err) throw err;
      if (!rows.includes(this)) rows.push(this);
      return this;
    };
    doc.deleteOne = async function deleteOne() {
      rows = rows.filter((r) => r !== this);
      return { deletedCount: 1 };
    };
    return doc;
  }

  // A thenable query that also supports .select() and .sort(), like Mongoose's.
  function query(result) {
    const q = {
      select: () => q,
      sort: (spec) => {
        if (Array.isArray(result)) {
          const [[field, dir]] = Object.entries(spec);
          result = [...result].sort((a, b) => (a.get(field) - b.get(field)) * dir);
        }
        return q;
      },
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    return q;
  }

  const Fake = {
    _reset() {
      rows = [];
    },
    _all() {
      return rows;
    },
    async create(data) {
      const doc = wrap(new RealModel(data));
      // Emulate the unique email index on users.
      if (doc.email && rows.some((r) => r.email === doc.email)) {
        const err = new Error("E11000 duplicate key error");
        err.code = 11000;
        throw err;
      }
      return doc.save();
    },
    findOne(filter) {
      return query(rows.find((r) => matches(r, filter)) || null);
    },
    find(filter) {
      return query(rows.filter((r) => matches(r, filter)));
    },
    findById(id) {
      if (!mongoose.isValidObjectId(id)) return query(null);
      return query(rows.find((r) => String(r._id) === String(id)) || null);
    },
  };
  return Fake;
}

module.exports = { makeFakeModel };
