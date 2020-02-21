const { cwd } = require('process');
const path = require('path');

module.exports = {
    /**
     * Location of the selected working folder.
     *
     * @returns {String}
     */
    workingDir: path.join(cwd(), 'data'),

    /**
     * Name of the selected private script.
     *
     * @returns {String}
     */
    scriptName: '',

    /**
     * Password from a user account with access to the script.
     *
     * @returns {String}
     */
    password: '',

    /**
     * Login from a user account with access to the script.
     *
     * @returns {String}
     */
    login: '',
};
