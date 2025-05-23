const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace("T", " ");
  };
  function success(res, message = "Thành công", data = null, code = 200) {
    return res.status(code).json({
      Code: code,
      Message: message,
      Data: data,
    });
  }
  
  function error(res, message = "Đã có lỗi xảy ra", code = 500, data = null) {
    return res.status(code).json({
      Code: code,
      Message: message,
      Data: data,
    });
  }
  const getFirstImageFromIntrotext = (introtext) => {
    if (!introtext) return null;
    const match = introtext.match(/<img[^>]+src="([^">]+)"/i);
    return match ? match[1] : null;
  };
  module.exports = {
    getCurrentDateTime,
    success,
    error,
    getFirstImageFromIntrotext
  };