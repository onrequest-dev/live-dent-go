export const getMyClinicIdOffline = (): string => {
  return localStorage.getItem("currentClinicId") || "my-clinic-offline";
}