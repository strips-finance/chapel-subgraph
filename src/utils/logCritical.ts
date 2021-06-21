import { log } from '@graphprotocol/graph-ts';


export function logDebug(message: string, parameters: string[] = new Array<string>()): void {
    log.debug(message, parameters);
}

export function logInfo(message: string, parameters: string[] = new Array<string>()): void {
    log.info(message, parameters);
}

export function logCritical(message: string, parameters: string[] = new Array<string>()): void {
  log.warning(message, parameters);
  log.critical(message, parameters);
}