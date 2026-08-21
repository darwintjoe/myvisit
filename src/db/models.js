import {Model} from '@nozbe/watermelondb';
import {field, children} from '@nozbe/watermelondb/decorators';

export class Shift extends Model {
  static table = 'shifts';

  static associations = {
    events: {type: 'has_many', foreignKey: 'shift_id'},
  };

  @field('start_time') startTime;
  @field('end_time') endTime;
  @field('current_state') currentState;

  @children('events') events;
}

export class Event extends Model {
  static table = 'events';

  static associations = {
    shift: {type: 'belongs_to', key: 'shift_id'},
  };

  @field('shift_id') shiftId;
  @field('timestamp') timestamp;
  @field('lat') lat;
  @field('lng') lng;
  @field('speed') speed;
  @field('activity_type') activityType;
  @field('event_type') eventType;
}
