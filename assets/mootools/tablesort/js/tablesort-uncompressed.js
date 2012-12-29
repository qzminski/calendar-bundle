/**
 * Contao Open Source CMS
 * 
 * Copyright (C) 2005-2012 Leo Feyer
 * 
 * @package Tablesort
 * @link    http://contao.org
 * @license http://www.gnu.org/licenses/lgpl-3.0.html LGPL
 */


/**
 * Current index
 */
var SORT_INDEX;
var THOUSANDS_SEPARATOR = ',';
var DECIMAL_SEPARATOR = '.';


/**
 * Class TableSort
 *
 * Provide methods to sort tables keeping the Contao class names intact.
 * @copyright  Leo Feyer 2005-2012
 * @author     Leo Feyer <http://contao.org>
 */
var TableSort = new Class(
{
	/**
	 * Initialize the object
	 * @param integer
	 * @param string
	 * @param string
	 */
	initialize: function(id, thousandsSeparator, decimalSeparator) {
		var table = $(id);

		if (thousandsSeparator) {
			THOUSANDS_SEPARATOR = thousandsSeparator;
		}
		if (decimalSeparator) {
			DECIMAL_SEPARATOR = decimalSeparator;
		}

		// Check whether table exists
		if (table == null) {
			return;
		}

		// Check whether table has rows
		if (!table.rows || table.rows.length < 1 || !table.tHead || table.tHead.rows.length < 1) {
			return;
		}

		var cook = null,
			vars = Cookie.read('TS_' + id.toUpperCase());

		if (vars !== null) {
			var cook = vars.split('|');
		}

		var lastRow = table.tHead.rows[table.tHead.rows.length-1];

		// Add the sorting links
		for (var i=0; i<lastRow.cells.length; i++) {
			if (lastRow.cells[i].className.indexOf('unsortable') != -1) {
				continue;
			}

			var el = lastRow.cells[i],
				txt = el.innerHTML,
				a = new Element('a').addClass('pointer');

			// Append text
			a.innerHTML = txt;
			el.innerHTML = '';

			// Add the event
			a.addEvent('click', function(i, el) {
				this.resort(i, el)
			}.pass([i, el], this)).inject(el);

			// Sort the table if there is a cookie
			if (cook !== null && cook[0] == i) {
				$(el).addClass((cook[1] == 'desc') ? 'asc' : 'desc');
				this.resort(cook[0], el);
			}
		}
	},

	/**
	 * Resort the table
	 * @param integer
	 * @param object
	 */
	resort: function(index, el) {
		var col = $(el);

		// Check whether the column exists
		if (col == null) {
			return;
		}

		var th = col.getParent('tr'),
			table = th.getParent('table');

		// Check whether table exists and there is more than one row
		if (table == null || table.tBodies[0].rows.length < 2) {
			return;
		}

		SORT_INDEX = index;

		var i = 0,
			val = '';

		// Skip emtpy cells and get value
		while (val == '' && table.tBodies[0].rows[i]) {
			val = table.tBodies[0].rows[i].cells[index].innerHTML.replace(/<[^>]+>/g, '').clean();
			i++;
		}

		var tbody = [];

		for (var i=0; i<table.tBodies[0].rows.length; i++) {
			tbody[i] = table.tBodies[0].rows[i];
		}

		// Date, currency, nubmers and strings are supported
		if (el.className.indexOf('date') != -1 || val.match(/^\d{1,4}[\/\. -]\d{1,2}[\/\. -]\d{1,4}$/)) {
			tbody.sort(this.sortDate);
		} else if (el.className.indexOf('currency') != -1 || val.match(/^[£$€Û¢´]/) || val.match(/^-?[\d\.,]+[£$€]$/)) {
			tbody.sort(this.sortNumeric);
		} else if (el.className.indexOf('numeric') != -1 || val.match(/^-?[\d\.,]+(E[-+][\d]+)?$/) || val.match(/^-?[\d\.,]+%?$/)) {
			tbody.sort(this.sortNumeric);
		} else {
			tbody.sort(this.sortCaseInsensitive);
		}

		// Sort ascending
		if (el.className.indexOf('asc') == -1) {
			var cs = th.getChildren();

			for (var i=0; i<cs.length; i++) {
				cs[i].removeClass('asc');
				cs[i].removeClass('desc');
			}

			el.addClass('asc');
			Cookie.write('TS_' + table.id.toUpperCase(), index + '|asc', { path: '/' });
		} else {
			var cs = th.getChildren();

			for (var i=0; i<cs.length; i++) {
				cs[i].removeClass('asc');
				cs[i].removeClass('desc');
			}

			el.addClass('desc');
			Cookie.write('TS_' + table.id.toUpperCase(), index + '|desc', { path: '/' });
			tbody.reverse(); // Descending
		}

		// Update the table
		for (i=0; i<tbody.length; i++) {
			var cls = tbody[i].className;
			cls = cls.replace(/row_\d+/, '').replace(/odd|even|row_first|row_last/g, '').clean();

			// Row number
			cls += ' row_' + i;

			// First row
			if (i == 0) {
				cls += ' row_first';
			}

			// Last row
			if (i >= (tbody.length-1)) {
				cls += ' row_last';
			}

			// Odd/even
			cls += (i%2 == 0) ? ' even' : ' odd';

			// Apply the tr class
			tbody[i].className = cls.trim();

			for (j=0; j<tbody[i].cells.length; j++) {
				var cls = tbody[i].cells[j].className;
				cls = cls.replace(/col_\d+/, '').replace(/odd|even|col_first|col_last/g, '').clean();

				// Col number
				cls += ' col_' + j;

				// First col
				if (j == 0) {
					cls += ' col_first';
				}

				// Last col
				if (j >= (tbody[i].cells.length-1)) {
					cls += ' col_last';
				}

				// Apply td class
				tbody[i].cells[j].className = cls.trim();
			}

			table.tBodies[0].appendChild(tbody[i]);
		}
	},

	/**
	 * Compare two dates
	 * @param string
	 * @param string
	 * @return integer
	 */
	sortDate: function(a, b) {
		aa = a.cells[SORT_INDEX].innerHTML.replace(/<[^>]+>/g, '').clean();
		bb = b.cells[SORT_INDEX].innerHTML.replace(/<[^>]+>/g, '').clean();

		var aaChunks = aa.replace(/[\/\.-]/g, ' ').split(' '),
			bbChunks = bb.replace(/[\/\.-]/g, ' ').split(' ');

		// DD-MM-YYYY
		if (aa.match(/^\d{1,2}[\/\. -]\d{1,2}[\/\. -]\d{2,4}$/)) {
			var aaTstamp = ((aaChunks[2].length == 4) ? aaChunks[2] : '19' + aaChunks[2]) + ((aaChunks[1].length == 2) ? aaChunks[1] : '0' + aaChunks[1]) + ((aaChunks[0].length == 2) ? aaChunks[0] : '0' + aaChunks[0]),
				bbTstamp = ((bbChunks[2].length == 4) ? bbChunks[2] : '19' + bbChunks[2]) + ((bbChunks[1].length == 2) ? bbChunks[1] : '0' + bbChunks[1]) + ((bbChunks[0].length == 2) ? bbChunks[0] : '0' + bbChunks[0]);
		}

		// YYYY-MM-DD
		if (aa.match(/^\d{2,4}[\/\. -]\d{1,2}[\/\. -]\d{1,2}$/)) {
			var aaTstamp = ((aaChunks[0].length == 4) ? aaChunks[0] : '19' + aaChunks[0]) + ((aaChunks[1].length == 2) ? aaChunks[1] : '0' + aaChunks[1]) + ((aaChunks[2].length == 2) ? aaChunks[2] : '0' + aaChunks[2]),
				bbTstamp = ((bbChunks[0].length == 4) ? bbChunks[0] : '19' + bbChunks[0]) + ((bbChunks[1].length == 2) ? bbChunks[1] : '0' + bbChunks[1]) + ((bbChunks[2].length == 2) ? bbChunks[2] : '0' + bbChunks[2]);
		}

		if (aaTstamp == bbTstamp) {
			return 0;
		} else if (aaTstamp < bbTstamp) {
			return -1;
		} else {
			return 1;
		}
	},

	/**
	 * Compare two numbers
	 * @param string
	 * @param string
	 * @return integer
	 */
	sortNumeric: function(a, b) {
		var rgxp = new RegExp('\\' + THOUSANDS_SEPARATOR, 'g');

		aa = a.cells[SORT_INDEX].innerHTML.replace(rgxp, '');
		bb = b.cells[SORT_INDEX].innerHTML.replace(rgxp, '');

		if (DECIMAL_SEPARATOR != '.') {
			aa = aa.replace(DECIMAL_SEPARATOR, '.');
			bb = bb.replace(DECIMAL_SEPARATOR, '.');
		}

		aa = aa.replace(/<[^>]+>/).replace(/[^0-9\.,-]/g, '').clean();
		bb = bb.replace(/<[^>]+>/).replace(/[^0-9\.,-]/g, '').clean();

		aa = parseFloat(aa);

		if (isNaN(aa)) {
			aa = 0;
		}

		bb = parseFloat(bb);

		if (isNaN(bb)) {
			bb = 0;
		}

		return aa - bb;
	},

	/**
	 * Compare two strings
	 * @param string
	 * @param string
	 * @return integer
	 */
	sortCaseInsensitive: function(a, b) {
		aa = a.cells[SORT_INDEX].innerHTML.replace(/<[^>]+>/g, '').clean().toLowerCase();
		bb = b.cells[SORT_INDEX].innerHTML.replace(/<[^>]+>/g, '').clean().toLowerCase();

		if (aa == bb) {
			return 0;
		} else if (aa < bb) {
			return -1;
		} else {
			return 1;
		}
	}
});