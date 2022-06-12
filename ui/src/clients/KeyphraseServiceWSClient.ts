import { Observable, Subject } from "rxjs";
import { JSONSchemaType } from "ajv";
import { AjvValidator } from "@ashley-evans/buzzword-object-validator";

import {
    PathnameOccurrences,
    KeyphraseServiceClient,
} from "./interfaces/KeyphraseServiceClient";

const schema: JSONSchemaType<PathnameOccurrences> = {
    type: "object",
    properties: {
        pathname: {
            type: "string",
        },
        keyphrase: {
            type: "string",
        },
        occurrences: {
            type: "number",
        },
    },
    required: ["pathname", "keyphrase", "occurrences"],
};

class KeyphraseServiceWSClient implements KeyphraseServiceClient {
    private connectionURL: string;
    private socket: WebSocket;
    private validator: AjvValidator<PathnameOccurrences>;
    private occurrences: Subject<PathnameOccurrences>;

    constructor(keyphraseServiceEndpoint: URL, baseURL: URL) {
        this.connectionURL = `${keyphraseServiceEndpoint.toString()}?baseURL=${baseURL.toString()}`;
        this.socket = new WebSocket(this.connectionURL);
        this.validator = new AjvValidator(schema);
        this.occurrences = new Subject();
    }

    observeKeyphraseResults(): Observable<PathnameOccurrences> {
        this.reconnectIfRequired();
        this.socket.addEventListener("close", () => {
            this.occurrences.complete();
        });

        this.socket.addEventListener("message", (event) => {
            try {
                const parsedEventData = JSON.parse(event.data);
                if (Array.isArray(parsedEventData)) {
                    for (const data of parsedEventData) {
                        const newOccurrence = this.validator.validate(data);
                        this.occurrences.next(newOccurrence);
                    }
                } else {
                    const newOccurrence = this.validator.validate(event.data);
                    this.occurrences.next(newOccurrence);
                }
            } catch {
                this.occurrences.error(new Error("Invalid response returned."));
            }
        });

        this.socket.addEventListener("error", () => {
            this.occurrences.error(
                new Error("Websocket connection closed due to an error.")
            );
        });

        return this.occurrences.asObservable();
    }

    private reconnectIfRequired(): void {
        if (
            !this.socket ||
            this.socket.readyState == WebSocket.CLOSING ||
            this.socket.readyState == WebSocket.CLOSED
        ) {
            this.socket = new WebSocket(this.connectionURL);
        }
    }
}

export default KeyphraseServiceWSClient;
