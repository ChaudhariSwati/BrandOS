console.log('Starting debug...');
try { require('dotenv').config(); console.log('dotenv OK'); } catch(e) { console.log('dotenv FAIL:', e.message); }
try { require('./src/utils/logger'); console.log('logger OK'); } catch(e) { console.log('logger FAIL:', e.message); }
try { require('./src/config/redis'); console.log('redis OK'); } catch(e) { console.log('redis FAIL:', e.message); }
try { require('./src/middleware/rateLimiter'); console.log('rateLimiter OK'); } catch(e) { console.log('rateLimiter FAIL:', e.message); }
try { require('./src/middleware/errorMiddleware'); console.log('errorMiddleware OK'); } catch(e) { console.log('errorMiddleware FAIL:', e.message); }
try { require('./src/middleware/requestMiddleware'); console.log('requestMiddleware OK'); } catch(e) { console.log('requestMiddleware FAIL:', e.message); }
try { require('./src/routes/demoRoutes'); console.log('demoRoutes OK'); } catch(e) { console.log('demoRoutes FAIL:', e.message); }
try { require('./src/routes/authRoutes'); console.log('authRoutes OK'); } catch(e) { console.log('authRoutes FAIL:', e.message); }
try { require('./src/routes/orgRoutes'); console.log('orgRoutes OK'); } catch(e) { console.log('orgRoutes FAIL:', e.message); }
try { require('./src/routes/brandKitRoutes'); console.log('brandKitRoutes OK'); } catch(e) { console.log('brandKitRoutes FAIL:', e.message); }
try { require('./src/routes/assetRoutes'); console.log('assetRoutes OK'); } catch(e) { console.log('assetRoutes FAIL:', e.message); }
try { require('./src/routes/exportRoutes'); console.log('exportRoutes OK'); } catch(e) { console.log('exportRoutes FAIL:', e.message); }
try { require('./src/config/db'); console.log('db OK'); } catch(e) { console.log('db FAIL:', e.message); }
console.log('All checks done');
