define([
    'require',
    'jquery',
    'moment',
    'base/js/namespace',
    'base/js/events',
    'notebook/js/codecell'
], function (
    requirejs,
    $,
    moment,
    Jupyter,
    events,
    codecell
) {
    'use strict';
    var mod_name = 'ExecuteTime';
    var log_prefix = '[' + mod_name + ']';
    var CodeCell = codecell.CodeCell;

    function patch_CodeCell_get_callbacks () {
        console.log(log_prefix, 'patching CodeCell.prototype.get_callbacks');
        var old_get_callbacks = CodeCell.prototype.get_callbacks;
        CodeCell.prototype.get_callbacks = function () {
            var callbacks = old_get_callbacks.apply(this, arguments);

            var cell = this;
            var prev_reply_callback = callbacks.shell.reply;
            callbacks.shell.reply = function (msg) {
                // console.log(log_prefix, JSON.stringify(msg));
                if (msg.msg_type === 'execute_reply') {
                    setTimeout( function(){
                    // console.log(log_prefix, JSON.stringify(Jupyter.notebook.get_prev_cell(Jupyter.notebook.get_selected_cell()).output_area.outputs[0]));
                        if ($.ui !== undefined) {
                            var input_area = cell.element.find('.input_area')
                            if((cell.output_area.outputs === undefined || cell.output_area.outputs.length == 0) || cell.output_area.outputs[0].output_type != 'error'){
                                input_area.stop(true,true).show(0).effect('highlight', {color: '#00bb00'});
                            } else{
                                input_area.stop(true,true).show(0).effect('highlight', {color: '#cc0000'});
                            }                            
                        }
                      }, 5 );
                }

                return prev_reply_callback(msg);
            };
            return callbacks;
        };
    }

    function excute_codecell_callback (evt, data) {
        var cell = data.cell;
        cell.metadata.ExecuteTime = {start_time: moment().toISOString()};

        update_timing_area(cell);

    }
    function update_timing_area (cell) {
        if (! (cell instanceof CodeCell) ||
                 !cell.metadata.ExecuteTime ||
                 !cell.metadata.ExecuteTime.start_time) {
            return $();
        }

        var timing_area = cell.element.find('.timing_area');
        if (timing_area.length < 1) {
            timing_area = $('<div/>')
                .addClass('timing_area' + (options.display_right_aligned ? ' text-right' : ''))
                .on('dblclick', function (evt) { toggle_timing_display([cell]); })
                .appendTo(cell.element.find('.input_area'));
        }

        var start_time = moment(cell.metadata.ExecuteTime.start_time),
              end_time = cell.metadata.ExecuteTime.end_time;
        var msg = options.template[end_time ? 'executed' : 'queued'];
        msg = msg.replace('${start_time}', format_moment(start_time));
        if (end_time) {
            end_time = moment(end_time);
            msg = msg.replace('${end_time}', format_moment(end_time));
            var exec_time = -start_time.diff(end_time);
            msg = msg.replace('${duration}', humanized_duration(exec_time));
        }
        timing_area.text(msg);
        return timing_area;
    }

    function load_jupyter_extension () {
        // try to load jquery-ui
        if ($.ui === undefined) {
            requirejs(['jquery-ui'], function ($) {}, function (err) {
                // try to load using the older, non-standard name (without hyphen)
                requirejs(['jqueryui'], function ($) {}, function (err) {
                    console.log(log_prefix, 'couldn\'t find jquery-ui, so no animations');
                });
            });
        }

        Jupyter.notebook.config.loaded.then(function () {

            patch_CodeCell_get_callbacks();
            events.on('execute.CodeCell', excute_codecell_callback );

        }).catch(function on_error (reason) {
            console.error(log_prefix, 'Error:', reason);
        });
    }

    return {
        load_jupyter_extension : load_jupyter_extension,
        load_ipython_extension : load_jupyter_extension
    };
});
