class CrawlError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, CrawlError.prototype);
    }

    get name(): string {
        return this.constructor.name;
    }
}

export default CrawlError;
