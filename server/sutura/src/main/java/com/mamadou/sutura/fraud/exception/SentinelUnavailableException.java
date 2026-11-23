package com.mamadou.sutura.fraud.exception;

/** Infrastructure failure, never a fraud verdict or permission to move money. */
public class SentinelUnavailableException extends RuntimeException {
    public SentinelUnavailableException(String message) { super(message); }
}
