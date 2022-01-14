class KeyphrasesError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, KeyphrasesError.prototype);
    }

    get name(): string {
        return this.constructor.name;
    }
}

export default KeyphrasesError;
