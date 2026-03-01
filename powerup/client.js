/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;

TrelloPowerUp.initialize({
    'card-buttons': function (t, options) {
        return [
            {
                icon: 'https://cdn.glitch.com/1b42d7ef-15b3-40ac-9082-a31fb2dcb274%2Fedit.svg',
                text: 'Generate Profile',
                callback: function (t) {
                    return t.alert({
                        message: 'Profile Generator Agent triggered (Simulated webhook fire)',
                        duration: 3,
                        display: 'info'
                    });
                }
            },
            {
                icon: 'https://cdn.glitch.com/1b42d7ef-15b3-40ac-9082-a31fb2dcb274%2Fsearch.svg',
                text: 'Find Directories',
                callback: function (t) {
                    return t.alert({
                        message: 'Researcher Agent triggered (Simulated webhook fire)',
                        duration: 3,
                        display: 'success'
                    });
                }
            },
            {
                icon: 'https://cdn.glitch.com/1b42d7ef-15b3-40ac-9082-a31fb2dcb274%2Fedit.svg',
                text: 'Draft Pitch',
                callback: function (t) {
                    return t.alert({
                        message: 'Pitch Agent triggered (Simulated webhook fire)',
                        duration: 3,
                        display: 'info'
                    });
                }
            },
            {
                icon: 'https://cdn.glitch.com/1b42d7ef-15b3-40ac-9082-a31fb2dcb274%2Flink.svg',
                text: 'Submit via Extension',
                callback: function (t) {
                    return t.get('card', 'shared', 'TargetURL').then(function (targetUrl) {
                        if (targetUrl) {
                            // Optionally could open a modal or new tab with this URL
                            t.alert({
                                message: 'Please open target URL and click the AI Autofill Extension.',
                                display: 'info'
                            });
                            window.open(targetUrl, '_blank');
                        } else {
                            t.alert({
                                message: 'No TargetURL found for this card. Make sure custom fields are set.',
                                display: 'error'
                            });
                        }
                    });
                }
            }
        ];
    },
    'card-custom-fields': function (t, options) {
        // Tell Trello to let us define custom fields, though typically configured in Trello dashboard
        return Promise.resolve([]);
    }
});
