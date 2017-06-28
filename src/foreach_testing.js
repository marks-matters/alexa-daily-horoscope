var data = {
    'starSignDates': {
        'aries':        {'fromDate': '03-21', 'toDate': '04-19'},
        'taurus':       {'fromDate': '04-20', 'toDate': '05-20'},
        'gemini':       {'fromDate': '05-21', 'toDate': '06-20'},
        'cancer':       {'fromDate': '06-21', 'toDate': '07-22'},
        'leo':          {'fromDate': '07-23', 'toDate': '08-22'},
        'virgo':        {'fromDate': '08-23', 'toDate': '09-22'},
        'libra':        {'fromDate': '09-23', 'toDate': '10-22'},
        'scorpio':      {'fromDate': '10-23', 'toDate': '11-21'},
        'sagittarius':  {'fromDate': '11-22', 'toDate': '12-21'},
        'capricorn':    {'fromDate': '12-22', 'toDate': '01-19'},
        'aquarius':     {'fromDate': '01-20', 'toDate': '02-18'},
        'pisces':       {'fromDate': '02-19', 'toDate': '03-20'}
    }
};

var compareToDate = new Date('2017-03-20');

function dateChecker(zodiacSign) {
    var correctStarSign = '';
    var compareYear = compareToDate.getFullYear();
    var rawFromDate = data.starSignDates[zodiacSign].fromDate;
    var rawToDate = data.starSignDates[zodiacSign].toDate;

    var fromDate = new Date(Date.UTC(compareYear, rawFromDate.substr(0,2) - 1, rawFromDate.substr(3,2)));
    var toDate = new Date(Date.UTC(compareYear, rawToDate.substr(0,2) - 1, rawToDate.substr(3,2)));

    var dateRange = data.starSignDates[zodiacSign];
    if (compareToDate >= fromDate && compareToDate <= toDate) {
        correctStarSign = zodiacSign;
        console.log(zodiacSign);
    }
}

// data.starSignDates.forEach(dateChecker());
// Object.keys(data.starSignDates).forEach(dateChecker());
Object.keys(data.starSignDates).forEach(function(zodiacSign) {
    dateChecker(zodiacSign);
});
