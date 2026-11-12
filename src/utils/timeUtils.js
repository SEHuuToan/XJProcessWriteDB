function formatSecondsToTime(totalSeconds) {
    const sec = parseInt(totalSeconds, 10) || 0;
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

module.exports = { formatSecondsToTime };