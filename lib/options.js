const { cwd } = require('process');
const path = require('path');

/**
 * Object that contains client settings.
 */
module.exports = {
    /**
     * Location of the selected working folder.
     */
    workingDir: path.join(cwd(), 'data'),

    /**
     * Name of the selected private script.
     */
    scriptName: '',

    /**
     * Password from a user account with access to the script.
     */
    password: '',

    /**
     * Login from a user account with access to the script.
     */
    login: ''
};