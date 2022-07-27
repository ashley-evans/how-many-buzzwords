type UpdateStatusEvent = {
    url?: string;
    status?: string;
};

type UpdateStatusResponse = {
    success: boolean;
};

interface UpdateStatusPrimaryAdapter {
    handleEvent(event: UpdateStatusEvent): Promise<UpdateStatusResponse>;
}

export { UpdateStatusEvent, UpdateStatusResponse, UpdateStatusPrimaryAdapter };
