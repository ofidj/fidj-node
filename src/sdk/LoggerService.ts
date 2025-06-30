import {LoggerInterface, LoggerLevelEnum} from './Interfaces';

export class LoggerService implements LoggerInterface {
    constructor(private level?: LoggerLevelEnum) {
        if (!level) {
            this.level = LoggerLevelEnum.ERROR;
        }

        if (typeof console === 'undefined') {
            this.level = LoggerLevelEnum.NONE;
        }
    }

    log(message: string, args: [any]) {
        if (this.level === LoggerLevelEnum.INFO) {
            console.log(message, args);
        }
    }

    warn(message: string, args: [any]) {
        if (this.level === LoggerLevelEnum.INFO || this.level === LoggerLevelEnum.WARN) {
            console.warn(message, args);
        }
    }

    error(message: string, args: [any]) {
        if (
            this.level === LoggerLevelEnum.INFO ||
            this.level === LoggerLevelEnum.WARN ||
            this.level === LoggerLevelEnum.ERROR
        ) {
            console.error(message, args);
        }
    }

    setLevel(level: LoggerLevelEnum) {
        this.level = level;
    }
}
