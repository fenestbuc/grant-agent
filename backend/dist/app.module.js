"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const notifications_module_1 = require("./modules/notifications/notifications.module");
const watchlist_module_1 = require("./modules/watchlist/watchlist.module");
const kb_module_1 = require("./modules/kb/kb.module");
const applications_module_1 = require("./modules/applications/applications.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const grants_module_1 = require("./modules/grants/grants.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            notifications_module_1.NotificationsModule,
            watchlist_module_1.WatchlistModule,
            kb_module_1.KbModule,
            applications_module_1.ApplicationsModule,
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            grants_module_1.GrantsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map