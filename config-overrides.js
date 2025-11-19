module.exports = function override(config, env) {
  // Remove deprecated onAfterSetupMiddleware and onBeforeSetupMiddleware
  if (config.devServer) {
    delete config.devServer.onAfterSetupMiddleware;
    delete config.devServer.onBeforeSetupMiddleware;
    
    // Use the new setupMiddlewares instead if needed
    if (!config.devServer.setupMiddlewares) {
      config.devServer.setupMiddlewares = (middlewares, devServer) => {
        return middlewares;
      };
    }
  }
  
  return config;
};
