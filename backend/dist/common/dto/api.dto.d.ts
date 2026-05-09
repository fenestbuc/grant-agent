export declare class PaginationDto {
    page?: string;
    per_page?: string;
    search?: string;
}
export declare class ApplicationDto {
    id?: string;
    grantId: string;
    answers: Record<string, string>;
    status?: string;
}
export declare class GenerateAnswerDto {
    grantId: string;
    questionId: string;
}
