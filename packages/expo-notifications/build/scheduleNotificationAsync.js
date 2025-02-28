import { Platform, UnavailabilityError } from 'expo-modules-core';
import { v4 as uuidv4 } from 'uuid';
import NotificationScheduler from './NotificationScheduler';
export default async function scheduleNotificationAsync(request) {
    if (!NotificationScheduler.scheduleNotificationAsync) {
        throw new UnavailabilityError('Notifications', 'scheduleNotificationAsync');
    }
    return await NotificationScheduler.scheduleNotificationAsync(request.identifier ?? uuidv4(), request.content, parseTrigger(request.trigger));
}
const DAILY_TRIGGER_EXPECTED_DATE_COMPONENTS = [
    'hour',
    'minute',
];
const WEEKLY_TRIGGER_EXPECTED_DATE_COMPONENTS = [
    'weekday',
    'hour',
    'minute',
];
const YEARLY_TRIGGER_EXPECTED_DATE_COMPONENTS = [
    'day',
    'month',
    'hour',
    'minute',
];
export function parseTrigger(userFacingTrigger) {
    if (userFacingTrigger === null) {
        return null;
    }
    if (userFacingTrigger === undefined) {
        throw new TypeError('Encountered an `undefined` notification trigger. If you want to trigger the notification immediately, pass in an explicit `null` value.');
    }
    if (isDateTrigger(userFacingTrigger)) {
        return parseDateTrigger(userFacingTrigger);
    }
    else if (isDailyTriggerInput(userFacingTrigger)) {
        validateDateComponentsInTrigger(userFacingTrigger, DAILY_TRIGGER_EXPECTED_DATE_COMPONENTS);
        return {
            type: 'daily',
            channelId: userFacingTrigger.channelId,
            hour: userFacingTrigger.hour,
            minute: userFacingTrigger.minute,
        };
    }
    else if (isWeeklyTriggerInput(userFacingTrigger)) {
        validateDateComponentsInTrigger(userFacingTrigger, WEEKLY_TRIGGER_EXPECTED_DATE_COMPONENTS);
        return {
            type: 'weekly',
            channelId: userFacingTrigger.channelId,
            weekday: userFacingTrigger.weekday,
            hour: userFacingTrigger.hour,
            minute: userFacingTrigger.minute,
        };
    }
    else if (isYearlyTriggerInput(userFacingTrigger)) {
        validateDateComponentsInTrigger(userFacingTrigger, YEARLY_TRIGGER_EXPECTED_DATE_COMPONENTS);
        return {
            type: 'yearly',
            channelId: userFacingTrigger.channelId,
            day: userFacingTrigger.day,
            month: userFacingTrigger.month,
            hour: userFacingTrigger.hour,
            minute: userFacingTrigger.minute,
        };
    }
    else if (isSecondsPropertyMisusedInCalendarTriggerInput(userFacingTrigger)) {
        throw new TypeError('Could not have inferred the notification trigger type: if you want to use a time interval trigger, pass in only `seconds` with or without `repeats` property; if you want to use calendar-based trigger, pass in `second`.');
    }
    else if ('seconds' in userFacingTrigger) {
        return {
            type: 'timeInterval',
            channelId: userFacingTrigger.channelId,
            seconds: userFacingTrigger.seconds,
            repeats: userFacingTrigger.repeats ?? false,
        };
    }
    else if (isCalendarTrigger(userFacingTrigger)) {
        const { repeats, ...calendarTrigger } = userFacingTrigger;
        return { type: 'calendar', value: calendarTrigger, repeats };
    }
    else {
        return Platform.select({
            default: null,
            android: { type: 'channel', channelId: userFacingTrigger.channelId },
        });
    }
}
function isCalendarTrigger(trigger) {
    const { channelId, ...triggerWithoutChannelId } = trigger;
    return Object.keys(triggerWithoutChannelId).length > 0;
}
function isDateTrigger(trigger) {
    return (trigger instanceof Date ||
        typeof trigger === 'number' ||
        (typeof trigger === 'object' && 'date' in trigger));
}
function parseDateTrigger(trigger) {
    if (trigger instanceof Date || typeof trigger === 'number') {
        return { type: 'date', timestamp: toTimestamp(trigger) };
    }
    return { type: 'date', timestamp: toTimestamp(trigger.date), channelId: trigger.channelId };
}
function toTimestamp(date) {
    if (date instanceof Date) {
        return date.getTime();
    }
    return date;
}
function isDailyTriggerInput(trigger) {
    if (typeof trigger !== 'object')
        return false;
    const { channelId, ...triggerWithoutChannelId } = trigger;
    return (Object.keys(triggerWithoutChannelId).length ===
        DAILY_TRIGGER_EXPECTED_DATE_COMPONENTS.length + 1 &&
        DAILY_TRIGGER_EXPECTED_DATE_COMPONENTS.every(component => component in triggerWithoutChannelId) &&
        'repeats' in triggerWithoutChannelId &&
        triggerWithoutChannelId.repeats === true);
}
function isWeeklyTriggerInput(trigger) {
    if (typeof trigger !== 'object')
        return false;
    const { channelId, ...triggerWithoutChannelId } = trigger;
    return (Object.keys(triggerWithoutChannelId).length ===
        WEEKLY_TRIGGER_EXPECTED_DATE_COMPONENTS.length + 1 &&
        WEEKLY_TRIGGER_EXPECTED_DATE_COMPONENTS.every(component => component in triggerWithoutChannelId) &&
        'repeats' in triggerWithoutChannelId &&
        triggerWithoutChannelId.repeats === true);
}
function isYearlyTriggerInput(trigger) {
    if (typeof trigger !== 'object')
        return false;
    const { channelId, ...triggerWithoutChannelId } = trigger;
    return (Object.keys(triggerWithoutChannelId).length ===
        YEARLY_TRIGGER_EXPECTED_DATE_COMPONENTS.length + 1 &&
        YEARLY_TRIGGER_EXPECTED_DATE_COMPONENTS.every(component => component in triggerWithoutChannelId) &&
        'repeats' in triggerWithoutChannelId &&
        triggerWithoutChannelId.repeats === true);
}
function isSecondsPropertyMisusedInCalendarTriggerInput(trigger) {
    const { channelId, ...triggerWithoutChannelId } = trigger;
    return (
    // eg. { seconds: ..., repeats: ..., hour: ... }
    ('seconds' in triggerWithoutChannelId &&
        'repeats' in triggerWithoutChannelId &&
        Object.keys(triggerWithoutChannelId).length > 2) ||
        // eg. { seconds: ..., hour: ... }
        ('seconds' in triggerWithoutChannelId &&
            !('repeats' in triggerWithoutChannelId) &&
            Object.keys(triggerWithoutChannelId).length > 1));
}
function validateDateComponentsInTrigger(trigger, components) {
    const anyTriggerType = trigger;
    components.forEach(component => {
        if (!(component in anyTriggerType)) {
            throw new TypeError(`The ${component} parameter needs to be present`);
        }
        if (typeof anyTriggerType[component] !== 'number') {
            throw new TypeError(`The ${component} parameter should be a number`);
        }
        switch (component) {
            case 'month': {
                const { month } = anyTriggerType;
                if (month < 0 || month > 11) {
                    throw new RangeError(`The month parameter needs to be between 0 and 11. Found: ${month}`);
                }
                break;
            }
            case 'day': {
                const { day, month } = anyTriggerType;
                const daysInGivenMonth = daysInMonth(month);
                if (day < 1 || day > daysInGivenMonth) {
                    throw new RangeError(`The day parameter for month ${month} must be between 1 and ${daysInGivenMonth}. Found: ${day}`);
                }
                break;
            }
            case 'weekday': {
                const { weekday } = anyTriggerType;
                if (weekday < 1 || weekday > 7) {
                    throw new RangeError(`The weekday parameter needs to be between 1 and 7. Found: ${weekday}`);
                }
                break;
            }
            case 'hour': {
                const { hour } = anyTriggerType;
                if (hour < 0 || hour > 23) {
                    throw new RangeError(`The hour parameter needs to be between 0 and 23. Found: ${hour}`);
                }
                break;
            }
            case 'minute': {
                const { minute } = anyTriggerType;
                if (minute < 0 || minute > 59) {
                    throw new RangeError(`The minute parameter needs to be between 0 and 59. Found: ${minute}`);
                }
                break;
            }
        }
    });
}
/**
 * Determines the number of days in the given month (or January if omitted).
 * If year is specified, it will include leap year logic, else it will always assume a leap year
 */
function daysInMonth(month = 0, year) {
    return new Date(year ?? 2000, month + 1, 0).getDate();
}
//# sourceMappingURL=scheduleNotificationAsync.js.map