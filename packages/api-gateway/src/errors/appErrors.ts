export class AppError extends Error {
    constructor(message: string, public statusCode: number) {
        super(message);
        this.name = new.target.name;
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) { super(message, 404); }
}

export class NotAuthorizedError extends AppError {
    constructor(message: string) { super(message, 403); }
}

export class VersionConflictError extends AppError {
    constructor(message: string) { super(message, 409); }
}

export class ValidationError extends AppError {
    constructor(message: string) { super(message, 400); }
}
