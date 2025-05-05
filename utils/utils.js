const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace("T", " ");
  };
  function success(res, message = "Thành công", data = null) {
    return res.status(200).json({
      status: "success",
      message,
      data,
    });
  }
  
  function error(res, message = "Đã có lỗi xảy ra", statusCode = 500) {
    return res.status(statusCode).json({
      status: "error",
      message,
    });
  }
  module.exports = {
    getCurrentDateTime,
    success,
    error,
  };