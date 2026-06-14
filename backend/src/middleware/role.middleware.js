export const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;

      if (!userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Role check failed",
      });
    }
  };
};