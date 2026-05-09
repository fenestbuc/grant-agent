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
exports.GrantsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
let GrantsService = class GrantsService {
    supabase;
    constructor() {
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    }
    async findAll(query) {
        let q = this.supabase.from('grants').select('*', { count: 'exact' }).eq('is_active', true);
        if (query.search) {
            q = q.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
        }
        const page = parseInt(query.page || '1');
        const perPage = parseInt(query.per_page || '20');
        const from = (page - 1) * perPage;
        q = q.range(from, from + perPage - 1);
        const { data, count, error } = await q;
        if (error)
            throw error;
        return { data, total: count, page, per_page: perPage };
    }
    async findOne(id) {
        const { data, error } = await this.supabase.from('grants').select('*').eq('id', id).single();
        if (error)
            throw error;
        return data;
    }
};
exports.GrantsService = GrantsService;
exports.GrantsService = GrantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GrantsService);
//# sourceMappingURL=grants.service.js.map