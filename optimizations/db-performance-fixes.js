"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
/**
 * Script to apply database performance optimizations
 * - Refresh materialized views
 * - Create necessary indexes
 * - Analyze tables
 */
function applyDatabaseOptimizations() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var viewCheck, viewExists, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🚀 Running database performance optimizations...');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 18, 19, 21]);
                    // 1. Check if materialized view exists
                    console.log('Checking materialized view status...');
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      SELECT COUNT(*) > 0 as exists \n      FROM pg_catalog.pg_class c \n      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace \n      WHERE c.relname = 'mv_dashboard_companions' \n      AND c.relkind = 'm'\n    "], ["\n      SELECT COUNT(*) > 0 as exists \n      FROM pg_catalog.pg_class c \n      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace \n      WHERE c.relname = 'mv_dashboard_companions' \n      AND c.relkind = 'm'\n    "])))];
                case 2:
                    viewCheck = _b.sent();
                    viewExists = Array.isArray(viewCheck) &&
                        viewCheck.length > 0 &&
                        ((_a = viewCheck[0]) === null || _a === void 0 ? void 0 : _a.exists) === true;
                    if (!viewExists) return [3 /*break*/, 4];
                    console.log('Refreshing existing materialized view...');
                    return [4 /*yield*/, prisma.$executeRawUnsafe("REFRESH MATERIALIZED VIEW CONCURRENTLY \"mv_dashboard_companions\"")];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 9];
                case 4:
                    console.log('Creating dashboard companions materialized view...');
                    // Drop the view if it exists but in a corrupt state
                    return [4 /*yield*/, prisma.$executeRawUnsafe("DROP MATERIALIZED VIEW IF EXISTS \"mv_dashboard_companions\"")];
                case 5:
                    // Drop the view if it exists but in a corrupt state
                    _b.sent();
                    // Create the new optimized view (with simpler query and fewer columns)
                    return [4 /*yield*/, prisma.$executeRawUnsafe("\n        CREATE MATERIALIZED VIEW \"mv_dashboard_companions\" AS\n        SELECT \n          c.id, \n          c.name, \n          c.src, \n          c.description,\n          c.\"categoryId\", \n          c.\"userName\",\n          c.\"isFree\",\n          c.global,\n          c.\"createdAt\"\n        FROM \"Companion\" c\n        WHERE c.private = false OR c.\"userId\" = 'system'\n        ORDER BY c.\"createdAt\" DESC\n      ")];
                case 6:
                    // Create the new optimized view (with simpler query and fewer columns)
                    _b.sent();
                    // Create indexes on the view
                    return [4 /*yield*/, prisma.$executeRawUnsafe("\n        CREATE UNIQUE INDEX IF NOT EXISTS \"mv_dashboard_companions_id_idx\" \n        ON \"mv_dashboard_companions\"(id)\n      ")];
                case 7:
                    // Create indexes on the view
                    _b.sent();
                    return [4 /*yield*/, prisma.$executeRawUnsafe("\n        CREATE INDEX IF NOT EXISTS \"mv_dashboard_companions_categoryId_idx\" \n        ON \"mv_dashboard_companions\"(\"categoryId\")\n      ")];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9:
                    // 3. Create indexes for anonymous user queries if they don't exist
                    console.log('Creating optimized indexes for anonymous user queries...');
                    // Index for the public companions (used in dashboard)
                    return [4 /*yield*/, prisma.$executeRawUnsafe("\n      CREATE INDEX IF NOT EXISTS \"idx_companion_public_system\" \n      ON \"Companion\" (private, \"userId\", \"createdAt\") \n      WHERE private = false OR \"userId\" = 'system'\n    ")];
                case 10:
                    // Index for the public companions (used in dashboard)
                    _b.sent();
                    // Index for category filtering
                    return [4 /*yield*/, prisma.$executeRawUnsafe("\n      CREATE INDEX IF NOT EXISTS \"idx_companion_category_public\" \n      ON \"Companion\" (\"categoryId\", private)\n    ")];
                case 11:
                    // Index for category filtering
                    _b.sent();
                    // Index for name search
                    return [4 /*yield*/, prisma.$executeRawUnsafe("\n      CREATE INDEX IF NOT EXISTS \"idx_companion_name\" \n      ON \"Companion\" (name)\n    ")];
                case 12:
                    // Index for name search
                    _b.sent();
                    // 4. Analyze tables for query planner
                    console.log('Analyzing tables to update statistics...');
                    return [4 /*yield*/, prisma.$executeRawUnsafe("ANALYZE \"Companion\"")];
                case 13:
                    _b.sent();
                    return [4 /*yield*/, prisma.$executeRawUnsafe("ANALYZE \"Category\"")];
                case 14:
                    _b.sent();
                    if (!viewExists) return [3 /*break*/, 16];
                    return [4 /*yield*/, prisma.$executeRawUnsafe("ANALYZE \"mv_dashboard_companions\"")];
                case 15:
                    _b.sent();
                    _b.label = 16;
                case 16:
                    // 5. Set up a daily refresh job using a stored procedure
                    console.log('Setting up materialized view refresh procedure...');
                    return [4 /*yield*/, prisma.$executeRawUnsafe("\n      CREATE OR REPLACE FUNCTION refresh_dashboard_views()\n      RETURNS void AS $$\n      BEGIN\n        REFRESH MATERIALIZED VIEW CONCURRENTLY \"mv_dashboard_companions\";\n        RETURN;\n      END;\n      $$ LANGUAGE plpgsql;\n    ")];
                case 17:
                    _b.sent();
                    console.log('✅ Database optimizations completed successfully!');
                    return [2 /*return*/, true];
                case 18:
                    error_1 = _b.sent();
                    console.error('❌ Database optimization error:', error_1);
                    return [2 /*return*/, false];
                case 19: return [4 /*yield*/, prisma.$disconnect()];
                case 20:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 21: return [2 /*return*/];
            }
        });
    });
}
// Run the function if this script is executed directly
if (require.main === module) {
    applyDatabaseOptimizations()
        .then(function () { return process.exit(0); })
        .catch(function (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
exports.default = applyDatabaseOptimizations;
var templateObject_1;
