"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
let ApplicationsService = class ApplicationsService {
    supabase;
    constructor() {
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || 'https://mock.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key');
    }
    async findAll(userId, grantId) {
        const { data: startup } = await this.supabase
            .from('startups')
            .select('id')
            .eq('user_id', userId)
            .single();
        if (!startup)
            throw new common_1.BadRequestException('Startup not found');
        let q = this.supabase.from('applications').select('*').eq('startup_id', startup.id);
        if (grantId)
            q = q.eq('grant_id', grantId);
        const { data, error } = await q;
        if (error)
            throw error;
        return data;
    }
    async createOrUpdate(userId, dto) {
        const { data: startup } = await this.supabase
            .from('startups')
            .select('id')
            .eq('user_id', userId)
            .single();
        if (!startup)
            throw new common_1.BadRequestException('Startup not found');
        if (dto.id) {
            const { data, error } = await this.supabase
                .from('applications')
                .update({ answers: dto.answers, status: dto.status })
                .eq('id', dto.id)
                .eq('startup_id', startup.id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        else {
            const { data, error } = await this.supabase
                .from('applications')
                .insert({
                startup_id: startup.id,
                grant_id: dto.grantId,
                answers: dto.answers,
                status: dto.status || 'draft',
            })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
    }
    async generateAnswer(userId, grantId, questionId) {
        return { answer: 'Mock generated answer using RAG' };
    }
};
exports.ApplicationsService = ApplicationsService;
exports.ApplicationsService = ApplicationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ApplicationsService);
//# sourceMappingURL=applications.service.js.map