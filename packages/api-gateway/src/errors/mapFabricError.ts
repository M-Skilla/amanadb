import { AppError, NotFoundError, NotAuthorizedError, VersionConflictError, ValidationError } from './appErrors';

// Fabric Gateway wraps the real chaincode error inside a longer gRPC
// message like: "2 UNKNOWN: evaluate call to endorser returned error:
// chaincode response 500, <actual message>". Pull out just the part
// after the last "chaincode response 500, " so pattern matching below
// works against the chaincode's own wording, not gRPC's wrapper text.
function extractChaincodeMessage(rawMessage: string): string {
    const marker = 'chaincode response 500, ';
    const idx = rawMessage.lastIndexOf(marker);
    return idx === -1 ? rawMessage : rawMessage.slice(idx + marker.length);
}

export function mapFabricError(err: unknown): AppError {
    const rawMessage = err instanceof Error ? err.message : String(err);
    const message = extractChaincodeMessage(rawMessage);

    if (/does not exist/i.test(message)) {
        return new NotFoundError(message);
    }
    if (/not authorized/i.test(message)) {
        return new NotAuthorizedError(message);
    }
    if (/version conflict/i.test(message)) {
        return new VersionConflictError(message);
    }
    if (/must be valid json|is required|invalid|does not look like/i.test(message)) {
        return new ValidationError(message);
    }

    // Unrecognized shape — genuinely unexpected (network failure, bug,
    // etc.), so it stays a generic 500 rather than being force-fit into
    // one of the above.
    return new AppError(message, 500);
}
