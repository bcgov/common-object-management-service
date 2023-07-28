const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany, filterILike } = require('../utils');

class ObjectModel extends Timestamps(Model) {
  static get tableName() {
    return 'object_queue';
  }

  static get modifiers() {
    return {
      filterBucketIds(query, value) {
        filterOneOrMany(query, value, 'object_queue.bucketId');
      },
      filterPath(query, value) {
        filterILike(query, value, 'object_queue.path');
      },
      findNextJob(query) {
        query.where('object_queue.id', builder => {
          builder
            .select('object_queue.id')
            .from('object_queue')
            .orderBy('object_queue.id', 'asc')
            // Need to ensure transactional integrity under concurrent loads
            // https://www.2ndquadrant.com/en/blog/what-is-select-skip-locked-for-in-postgresql-9-5/
            .forUpdate()
            .skipLocked()
            .limit(1);
        });
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['path', 'full', 'retries'],
      properties: {
        id: { type: 'integer' },
        bucketId: { type: 'string', maxLength: 255, nullable: true },
        path: { type: 'string', minLength: 1, maxLength: 1024 },
        full: { type: 'boolean' },
        retries: { type: 'integer' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectModel;
