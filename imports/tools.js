export const p = (...arg) => console.log(...arg)
export const now = () => (new Date()).getTime()
export const formatTime = (miliseconds) => (new Date(miliseconds - 18000000)).toISOString()