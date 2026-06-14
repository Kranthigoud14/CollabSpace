export const successResponse = (res, message = "Success", data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, message = "Something went wrong", error = null, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};