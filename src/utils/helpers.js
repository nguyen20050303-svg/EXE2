export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 9);
};
