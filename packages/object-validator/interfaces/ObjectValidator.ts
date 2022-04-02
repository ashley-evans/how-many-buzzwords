interface ObjectValidator<ValidType> {
    validate(input: unknown): ValidType;
}

export default ObjectValidator;
