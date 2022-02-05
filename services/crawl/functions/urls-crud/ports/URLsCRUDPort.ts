type CRUDResponse = {
    baseURL: string,
    pathnames: string[]
};

enum SupportedMethods {
    GET
}

interface URLsCRUDPort {
    handleRequest(method: SupportedMethods, baseURL: string): CRUDResponse;
}

export {
    CRUDResponse,
    SupportedMethods,
    URLsCRUDPort
};
