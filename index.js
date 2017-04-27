'use strict';
const dargs = require('dargs');
const execa = require('execa');
const gutil = require('gulp-util');
const through = require('through2');
// TODO: Use execa localDir option when available
const npmRunPath = require('npm-run-path');
const utils = require('./utils');

const convertObjectToList = utils.convertObjectToList;

const HUNDRED_MEGABYTES = 1000 * 1000 * 100;

// Mocha options that can be specified multiple times
const MULTIPLE_OPTS = [
	'require'
];

module.exports = opts => {
	opts = Object.assign({
		colors: true,
		suppress: false
	}, opts);

	// Convert arrays into comma separated lists
	for (const key of Object.keys(opts)) {
		const val = opts[key];

		if (MULTIPLE_OPTS.indexOf(key) > 0 && Array.isArray(val)) {
			opts[key] = val.join(',');

			// Convert an object into comma separated list.
		} else if (typeof val === 'object') {
			opts[key] = convertObjectToList(val);
		}
	}

	const args = dargs(opts, {
		excludes: ['suppress'],
		ignoreFalse: true
	});

	const files = [];

	function aggregate(file, encoding, done) {
		if (file.isStream()) {
			done(new gutil.PluginError('gulp-mocha', 'Streaming not supported'));
			return;
		}

		files.push(file.path);

		done();
	}

	function flush(done) {
		const env = npmRunPath.env({cwd: __dirname});
		const proc = execa('mocha', files.concat(args), {
			env,
			maxBuffer: HUNDRED_MEGABYTES
		});

		proc.then(result => {
			this.emit('_result', result);
			done();
		})
			.catch(err => {
				this.emit('error', new gutil.PluginError('gulp-mocha', err));
				done();
			});

		if (!opts.suppress) {
			proc.stdout.pipe(process.stdout);
			proc.stderr.pipe(process.stderr);
		}
	}

	return through.obj(aggregate, flush);
};
