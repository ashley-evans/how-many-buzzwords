import React, { Fragment } from "react";
import { Form, Input, Button } from "antd";

type URLInputProps = {
    onURLSubmit: (url: URL) => unknown;
};

type URLInputFormInputs = {
    url: string;
};

const MISSING_URL_MESSAGE = "Please enter a URL.";
const INVALID_URL_MESSAGE = "Please enter a valid URL.";

function convertToURL(input: string): URL {
    if (!input.startsWith("https://") && !input.startsWith("http://")) {
        input = `https://${input}`;
    }

    return new URL(input);
}

function URLInput(props: URLInputProps) {
    const [form] = Form.useForm();

    const validateURL = async (_: unknown, url: string) => {
        if (!url) {
            throw new Error(MISSING_URL_MESSAGE);
        } else if (!isNaN(parseInt(url))) {
            throw new Error(INVALID_URL_MESSAGE);
        }

        try {
            convertToURL(url);
        } catch {
            throw new Error(INVALID_URL_MESSAGE);
        }
    };

    const onFinish = (inputs: URLInputFormInputs) => {
        props.onURLSubmit(convertToURL(inputs.url));
    };

    return (
        <Fragment>
            <Form form={form} onFinish={onFinish}>
                <Form.Item
                    name="url"
                    label="URL"
                    rules={[
                        {
                            validator: validateURL,
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item>
                    <Button htmlType="submit">Search!</Button>
                </Form.Item>
            </Form>
        </Fragment>
    );
}

export { URLInput };
export type { URLInputProps };
