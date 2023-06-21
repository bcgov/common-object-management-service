const { Model } = require('objection');

class Tag extends Model {
  static get tableName() {
    return 'tag';
  }

  static get relationMappings() {
    const Version = require('./version');
    const VersionTag = require('./versionTag');

    return {
      versionTag: {
        relation: Model.HasManyRelation,
        modelClass: VersionTag,
        join: {
          from: 'tag.id',
          to: 'version_tag.tagId'
        }
      },

      version: {
        relation: Model.ManyToManyRelation,
        modelClass: Version,
        join: {
          from: 'tag.id',
          through: {
            from: 'version_tag.tagId',
            to: 'version_tag.versionId'
          },
          to: 'version.id'
        }
      }
    };
  }

  static get modifiers() {
    return {
      filterKey(query, value) {
        const subqueries = [];
        if (value.tag && Object.keys(value.tag).length) {
          Object.entries(value.tag).forEach(tag => {
            const q = Tag.query().select('tag.id').where('key', 'ilike', `%${tag[0]}%`);
            subqueries.push(q);
          });
        }
        if (subqueries.length) {
          query
            .whereIn('tag.id', builder => {
              builder.intersect(subqueries);
            });
        }
      },

      filterKeyValue(query, value) {
        const subqueries = [];
        if (value.tag && Object.keys(value.tag).length) {
          Object.entries(value.tag).forEach(([key, val]) => {
            const q = Tag.query().select('tag.id').where('key', 'ilike', `%${key}%`);
            if (val.length) q.where('value', 'ilike', `%${val}%`);
            subqueries.push(q);
          });
        }
        if (subqueries.length) {
          query
            .whereIn('tag.id', builder => {
              builder.intersect(subqueries);
            });
        }
      },
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['key', 'value'],
      properties: {
        id: { type: 'integer' },
        key: { type: 'string', minLength: 1, maxLength: 128 },
        value: { type: 'string', maxLength: 256 }
      },
      additionalProperties: false
    };
  }
}

module.exports = Tag;
