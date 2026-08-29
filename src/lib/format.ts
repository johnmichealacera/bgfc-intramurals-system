export const format = {
  date(value: string | Date) {
    return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  },
  dateTime(value: string | Date) {
    return new Date(value).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  },
  time(value: string | Date) {
    return new Date(value).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  },
};
