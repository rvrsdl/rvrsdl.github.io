//Wishlist of things to add
// 1. Select component of graph and just see how that evolves (discoard other components)
// 2. Plot spacetime diagram in the lowe rleft as we go along.
// 3. Interactive matrix maths illustration (show calc for selected node)
// 4. DONE (not tested with seeds) Submit settings form (halfway there, just need to "apply" the input) 
// 5. Preset examples (seed graph and rule)
// 6. Versions 2 & 4!

const ALLSTATES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
// using the "Dutch Field" colour palette from here: https://www.heavy.ai/blog/12-color-palettes-for-telling-better-stories-with-your-data
const COLOURS = ["#e60049", "#0bb4ff", "#e6d800", "#50e991", "#9b19f5", "#ffa300", "#dc0ab4", "#b3d4ff", "#00bfa0"]
//const COLOURS = ["DarkRed","DarkGreen","DarkBlue","DarkMagenta","DarkOrange","DarkCyan","DarkSlateGray","DarkSalmon"];
var VERSION = 'v3';
var TIMESTEP = 0;
var NUMSTATES = 0;
var STATES = [];
var RULE = {};
var SEEDGRAPH = {};
var next_node_id = 0;
var cy = {}; // To hold cytoscape variable.

document.getElementById("redo-layout").addEventListener("click", _ => redoLayout(true));
document.getElementById("step_fwd").addEventListener("click", stepForward); //applyTransitions
document.getElementById("step_bck").addEventListener("click", stepBack);
document.getElementById("reset_button").addEventListener("click", resetCytoscape);
document.getElementById("submit-json-settings").addEventListener("click", submitJSONSettings);
document.getElementById("submit-dropdown-settings").addEventListener("click", submitDropdownSettings);

var model_version_dropdown = document.getElementById("model-version-dropdown")
var num_states_dropdown = document.getElementById("num-states-dropdown");
var seed_graph_dropdown = document.getElementById("seed-graph-dropdown");
var json_settings_textarea = document.getElementById("json-settings-textarea");
var rule_size_info = document.getElementById("rule-size");

var cy_style = [
    {
        selector: 'edge',
        style: {
            'width': 3,
            'line-color': '#4d4d33',
            'target-arrow-color': '#4d4d33',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
        }
    },
    {
        selector: 'node:selected',
        style: {
            'border-width': 2,
            'border-color': '#4d4d33'
        }
    },
    {
        selector: 'node[deleting=1]',
        style: {
            'background-fill': 'radial-gradient',
            'background-gradient-stop-colors': ['red', 'white'],
            'background-gradient-stop-positions': ['0%', '50%']
        }
    },
    {
        selector: 'node[splitting=1]',
        style: {
            'border-width': 2,
            'border-color': 'lime'
        }
    },
];
// Make each state node have a different colour
ALLSTATES.forEach((st, idx) => {
    cy_style.push(
        {
            selector: `node[state="${st}"]`,
            style: {
                shape: 'ellipse',
                'background-color': COLOURS[idx],
                label: 'data(id)'
            }
        }
    )
});

window.onload = initPage();
function defaultSettings() {
    model_version_dropdown.value = 'v3';
    num_states_dropdown.value = 3;
    initNumStates();
    seed_graph_dropdown.value = 'arrow';
    seedGraphChooser();
}

function initPage() {
    defaultSettings();
    console.log(seed_graph_dropdown.value);
    cy = initCytoscape();
    cy.ready(_ => {
        refreshEvents();
        next_node_id = cy.nodes().length; // reset node counter
        TIMESTEP = 0;
    });
    setJSONSettings();
}

function initNumStates() {
    // Set the STATES and RULE vars
    NUMSTATES = num_states_dropdown.value;
    VERSION = model_version_dropdown.value;
    STATES = ALLSTATES.slice(0, NUMSTATES);
    if (VERSION == 'v2') {
        RULE = nj.random([2 + STATES.length, (2 * STATES.length) + 1]).multiply(2).subtract(1); // *2-1 to put in range (-1,1)
    } else if (VERSION == 'v3') {
        RULE = nj.random([3 + 12 + STATES.length, (2 * STATES.length) + 1]).multiply(2).subtract(1); // *2-1 to put in range (-1,1)
    } else if (VERSION == 'v4') {
        alert('Version 4 not yet implemented.\nSwitching to version 3.');
        // set to v3 and call again.
        model_version_dropdown.value = 'v3';
        initNumStates();
    }
    console.log(RULE)
    rule_size_info.innerHTML = RULE.size;
    //makeNeighCountTable();
}

function seedGraphChooser() {
    //uses the seed graph specified in the dropdown to assign to the global seed_graph variable.
    // assigns states randomly.
    if (seed_graph_dropdown.value == 'arrow') {
        SEEDGRAPH = {
            nodes: [
                { data: { id: 0, state: choose(STATES) } },
                { data: { id: 1, state: choose(STATES) } },
                { data: { id: 2, state: choose(STATES) } },
                { data: { id: 3, state: choose(STATES) } }
            ],
            edges: [
                { data: { id: '0->1', source: 0, target: 1 } },
                { data: { id: '0->2', source: 0, target: 2 } },
                { data: { id: '1->2', source: 1, target: 2 } },
                { data: { id: '2->3', source: 2, target: 3 } }
            ]
        };
    } else if (seed_graph_dropdown.value == 'single_node') {
        SEEDGRAPH = {
            nodes: [
                { data: { id: 0, state: choose(STATES) } }
            ],
            edges: [
                { data: { id: '0->0', source: 0, target: 0 } }
            ]
        };
    } else if (seed_graph_dropdown.value == 'ring4') {
        SEEDGRAPH = {
            nodes: [
                { data: { id: 0, state: choose(STATES) } },
                { data: { id: 1, state: choose(STATES) } },
                { data: { id: 2, state: choose(STATES) } },
                { data: { id: 3, state: choose(STATES) } }
            ],
            edges: [
                { data: { id: '0->1', source: 0, target: 1 } },
                { data: { id: '1->2', source: 1, target: 2 } },
                { data: { id: '2->3', source: 2, target: 3 } },
                { data: { id: '3->0', source: 3, target: 0 } }
            ]
        };
    }
}

function choose(choices) {
    var index = Math.floor(Math.random() * choices.length);
    return choices[index];
}

function initCytoscape() {
    //console.log(SEEDGRAPH)
    var seed_graph_copy = JSON.parse(JSON.stringify(SEEDGRAPH)); // use a copy so that changes aren't preserved in original seed_graph so that we can reset.
    var cyx = cytoscape({
        container: document.getElementById('cy'),
        elements: seed_graph_copy,
        style: cy_style,
        layout: {
            name: 'fcose' //'cola'
        }
    });
    cyx.data('prev', cyx.json());
    return cyx
}

function resetCytoscape() {
    cy.destroy();
    cy = initCytoscape();
    next_node_id = cy.nodes().length; // reset node counter
    TIMESTEP = 0;
}

function setJSONSettings() {
    var all_settings = { version: VERSION, num_states: NUMSTATES, rule: RULE, seed_graph: SEEDGRAPH };
    json_settings_textarea.value = JSON.stringify(all_settings);
}

function submitJSONSettings() {
    // get whatever is in the seetings textarea
    // TODO: some error checking (eg. check rule matrix is the right size)
    var settings = JSON.parse(json_settings_textarea.value);
    console.log('submitjsonsettings');
    num_states_dropdown.value = settings.num_states; // first set the dropdown to the correct value
    model_version_dropdown.value = settings.version;
    initNumStates(); // gets values from the dropdowns
    RULE = nj.array(JSON.parse(settings.rule));
    seed_graph_dropdown.value = 'custom-JSON';
    SEEDGRAPH = settings.seed_graph;
    setJSONSettings(); // just to reformat the input nicely
    resetCytoscape();
    refreshEvents();
}

function submitDropdownSettings() {
    // TODO: enable setting seed graph and model version.
    initNumStates();
    seedGraphChooser();
    setJSONSettings();
    resetCytoscape();
    refreshEvents();
}


function refreshEvents() {
    // necessary when we have added new nodes.
    cy.nodes().unbind("mouseover");
    cy.nodes().bind("mouseover", event => nodeMouseover(event.target));
    cy.nodes().unbind("mouseout");
    cy.nodes().bind("mouseout", event => nodeMouseout(event.target));
}

// function makeNeighCountTable() {
//     var tabledat = '<tbody>';
//     STATES.forEach(function(st, idx) {
//         tabledat += `<tr><td><span style="color:${COLOURS[idx]}">${st}</span></td><td id="${st}_in"></td><td id="${st}_out"></td><tr>`;
//     });
//     tabledat += '</tbody>';
//     document.getElementById('tableData').innerHTML = tabledat;
// }

// function fillNeighCountTable(node) {
//     var in_counts = getInNeighbourStateCounts(node);
//     var out_counts = getOutNeighbourStateCounts(node);
//     Object.entries(in_counts).forEach(([st,cnt]) => {
//         document.getElementById(`${st}_in`).innerHTML = cnt;
//     });
//     Object.entries(out_counts).forEach(([st,cnt]) => {
//         document.getElementById(`${st}_out`).innerHTML = cnt;
//     })
// }

function createNeighCountTable(node) {
    // Create and fill table all in one go, for a particular node.
    // This will be called when we mouseover a node, and will be put in the tooltip.
    var table = '<div>NeighbourCounts<table class="center"><thead><tr><th>State</th><th>In</th><th>Out</th></tr></thead><tbody>'
    var in_counts = getInNeighbourStateCounts(node);
    var out_counts = getOutNeighbourStateCounts(node);
    var node_state = node.data('state');
    STATES.forEach(function (st, idx) {
        var underline = "text-decoration-line:none;";
        if (st==node_state) {
            underline = "text-decoration-line:underline;";
        }
        table += `<tr><td><span style="color:${COLOURS[idx]};font-weight:bold;${underline}">${st}</span></td><td>${in_counts[st]}</td><td>${out_counts[st]}</td><tr>`;
    });
    table += '</tbody></table></div>';
    return table;
}

function nodeMouseover(node) {
    // All the stuff I want to happen on mouseover.
    console.log('mouseover');
    node.select();
    makeTooltip(node);
    node.tippy.show();
}

function nodeMouseout(node) {
    // All the stuff I want to happen on mouseover.
    //var out_idx = getNeighbourStateOrder(node);
    //unHighlightTableRow(out_idx);
    node.unselect();
    node.tippy.hide();
}

function makeTooltip(node) {
    // make a tooltip showing counts of incoming and outgoing nodes.
    var ref = node.popperRef(); // used for positioning
    node.tippy = tippy(ref, {
        content: createNeighCountTable(node),
        trigger: "manual"
    })
}

function redoLayout(randomise) {
    cy.layout({
        name: 'fcose', //'cola'
        randomize: randomise
    }).run();
}

function getNeighbourStateCounts(node) {
    var counts = {}
    STATES.forEach(function (st, idx) {
        counts[st] = node.neighbourhood(`node[state="${st}"]`).length
    });
    return counts
}

function getOutNeighbourStateCounts(node) {
    var counts = {}
    STATES.forEach(function (st, idx) {
        counts[st] = node.outgoers().nodes(`node[state="${st}"]`).length
    });
    return counts
}

function getInNeighbourStateCounts(node) {
    var counts = {}
    STATES.forEach(function (st, idx) {
        counts[st] = node.incomers().nodes(`node[state="${st}"]`).length
    });
    return counts
}

function getDirectedNeighbourStateCounts(node) {
    var counts = {}
    counts['out'] = {}
    counts['in'] = {}
    STATES.forEach(function (st, idx) {
        counts['out'][st] = node.outgoers().nodes(`node[state="${st}"]`).length;
        counts['in'][st] = node.incomers().nodes(`node[state="${st}"]`).length;
    });
    //console.log('hello');
    return counts
}

function getNeighbourhoodCountVector(node) {
    // returns a NumJS array of [in_A, in_B,... out_A, out_B,... bias(1)]
    var counts = []
    STATES.forEach(function (st, idx) {
        counts.push(node.incomers().nodes(`node[state="${st}"]`).length);
    });
    STATES.forEach(function (st, idx) {
        counts.push(node.outgoers().nodes(`node[state="${st}"]`).length);
    });
    counts.push(1) // for bias
    var vec = nj.array(counts);
    return vec
}

function getNeighbourhoodLaplacianVector(node) {
    // returns a NumJS array of bidirectional Laplacian filtered counts (as in ALife paper)
    // ie. if the central node is in state A:
    // [in_deg(node)-in_A, -in_B,... out_deg(A)-out_A, -out_B,... bias(1)]
    var counts = []
    var in_deg = node.incomers().nodes().length;
    var out_deg = node.outgoers().nodes.length;
    var node_state = node.data('state');
    // first do incoming
    STATES.forEach(function (st, idx) {
        if (st == node_state) {
            counts.push(in_deg - node.incomers().nodes(`node[state="${st}"]`).length);
        } else {
            counts.push(-node.incomers().nodes(`node[state="${st}"]`).length);
        }
    });
    // then do outgoing
    STATES.forEach(function (st, idx) {
        if (st == node_state) {
            counts.push(out_deg - node.outgoers().nodes(`node[state="${st}"]`).length);
        } else {
            counts.push(-node.outgoers().nodes(`node[state="${st}"]`).length);
        }
    });
    counts.push(1) // for bias
    var vec = nj.array(counts);
    return vec
}

function dgcaStep() {
    // This calculates all the info to do a step but doesn't actually make the changes
    // (since we are looping through nodes assesing neighbourhoods etc. it would
    // get messed up if we were changing things as we went along)
    cy.data('prev', cy.json()); // Store previous state in the prev field
    var current_nodes = cy.nodes()
    var to_remove = [];
    var new_states = {};
    var split_flags = {};
    // first loop through current nodes and determine what action they should take.
    current_nodes.forEach(function (nd) {
        var nd_id = nd.data('id');
        var inp_vec = getNeighbourhoodLaplacianVector(nd);
        var out_vec = nj.tanh(nj.dot(RULE, inp_vec));
        if (VERSION == 'v2') {
            var result = argMax(out_vec);
            if (result < STATES.length) {
                // just change state
                new_states[nd_id] = STATES[result];
            } else if (result == STATES.length) {
                // remove node action (but only at end)
                nd.data('deleting', 1);
                to_remove.push(nd_id);
            } else if (result == (STATES.length + 1)) {
                nd.data('splitting', 1);
                split_flags[nd_id] = {};
                split_flags[nd_id]['n'] = 0;
                split_flags[nd_id]['lf'] = 2;
                split_flags[nd_id]['lb'] = 2;
            }
        } else if (VERSION == 'v3') {
            var action_choice = argMax(out_vec.slice([3]));
            if (action_choice == 0) {
                // remove node action (but only at end)
                nd.data('deleting', 1);
                to_remove.push(nd_id);
            } else if (action_choice == 1) {
                // node remains, just find new state
                new_states[nd_id] = STATES[argMax(out_vec.slice(-STATES.length))]; // argmax of last S items
            } else if (action_choice == 2) {
                // node splits. We need to work out split type
                nd.data('splitting', 1);
                split_flags[nd_id] = {};
                split_flags[nd_id]['n'] = argMax(out_vec.slice([3, 7]));
                split_flags[nd_id]['lf'] = argMax(out_vec.slice([7, 11]));
                split_flags[nd_id]['lb'] = argMax(out_vec.slice([11, 15]));
                // also find new state
                new_states[nd_id] = STATES[argMax(out_vec.slice(-STATES.length))]; // argmax of last S items
            } else {
                console.log("Something wrong!")
            };
        }

    });
    console.log("To remove:");
    console.log(to_remove);
    console.log("New states:");
    console.log(new_states);
    console.log("Split flags:");
    console.log(split_flags);

    // May as well actually do it in same function!
    TIMESTEP += 1;
    // CREATE NEW NODES
    // keep a ref to parent node (to make it easier to draw correct edges)
    var new_node_ids = [];
    // create dict from node_id to parent (node which divided to create them) and vice versa
    var node_parents = {};
    var node_children = {};
    var orig_incomers = {};
    var orig_outgoers = {};
    Object.keys(split_flags).forEach(nd_id => {
        //NB was adding the parent node as "parent: nd.data('id')" - this creates compound nodes,
        // and I thiiink automatically adds the "children" property to any node we have specified as a parent.
        //Now using the node_parents and node_children dicts instead, BUT compound nodes could actually be useful
        //for plotting (as an intermediate step showing new nodes being "born")
        // keep dicts of current node incomers and outgoers - needed when creating child edges
        orig_incomers[nd_id] = cy.nodes('#' + nd_id).incomers('node');
        orig_outgoers[nd_id] = cy.nodes('#' + nd_id).outgoers('node');
        var orig_state = cy.nodes('#' + nd_id).data('state'); // new node gets orig node state
        parent_pos = cy.nodes('#' + nd_id).position();
        cy.add({ group: 'nodes', data: { id: next_node_id, state: orig_state }, position: { x: parent_pos.x + 1, y: parent_pos.y + 1 } });
        new_node_ids.push(next_node_id);
        node_parents[next_node_id] = nd_id;
        node_children[nd_id] = next_node_id;
        next_node_id += 1;
    });
    // LINK UP NEW NODES
    new_node_ids.forEach(child_id => {
        var parent_id = node_parents[child_id];
        //var parent_node = cy.nodes('#'+parent_id);
        // var child_node = cy.node(child_id);
        // var parent_node = child_node.data('parent');
        // var parent_id = parent_node.data('id');
        //var parent_incomers = parent_node.incomers('node');
        //var parent_outgoers = parent_node.outgoers('node');
        var parent_incomers = orig_incomers[parent_id];
        var parent_outgoers = orig_outgoers[parent_id];

        // deal with "link forward" - from existing to new
        var lf = split_flags[parent_id]['lf'];
        if (lf == 0) {
            // no link forward
        } else if (lf == 1) {
            // link from parent to child
            cy.add({ group: 'edges', data: { id: `${parent_id}->${child_id}`, source: parent_id, target: child_id } });
        } else if (lf == 2) {
            // link from parent incomers to child
            parent_incomers.forEach(src_node => {
                var src_id = src_node.data('id');
                cy.add({ group: 'edges', data: { id: `${src_id}->${child_id}`, source: src_id, target: child_id } });
            });
        } else if (lf == 3) {
            // link from parent outgoers to child
            parent_outgoers.forEach(src_node => {
                var src_id = src_node.data('id');
                cy.add({ group: 'edges', data: { id: `${src_id}->${child_id}`, source: src_id, target: child_id } });
            });
        } else {
            console.log("Something wrong!")
        };
        // deal with "link backwards" - from new to existing
        var lb = split_flags[parent_id]['lb'];
        if (lb == 0) {
            // no link backwards
        } else if (lb == 1) {
            // link from child to parent
            cy.add({ group: 'edges', data: { id: `${child_id}->${parent_id}`, source: child_id, target: parent_id } });
        } else if (lb == 2) {
            // link from child to parent outgoers
            parent_outgoers.forEach(target_node => {
                var target_id = target_node.data('id');
                cy.add({ group: 'edges', data: { id: `${child_id}->${target_id}`, source: child_id, target: target_id } });
            });
        } else if (lb == 3) {
            // link from child to parent incomers (transpose)
            parent_incomers.forEach(target_node => {
                var target_id = target_node.data('id');
                cy.add({ group: 'edges', data: { id: `${child_id}->${target_id}`, source: child_id, target: target_id } });
            });
        } else {
            console.log("Something wrong!")
        };
        // deal with "links new" (n) - amongst new nodes
        // TODO this can cause an error if two siblings both decide to make the same edge (in the same direction)
        // is it a flaw of thw
        var ln = split_flags[parent_id]['n'];
        if (ln == 0) {
            // no link
        } else if (ln == 1) {
            // link to self
            cy.add({ group: 'edges', data: { id: `${child_id}->${child_id}`, source: child_id, target: child_id } });
        } else if (ln == 2) {
            // links to the children of parent outgoers
            parent_outgoers.forEach(parout => {
                if (parout.data('id') in node_children) {
                    var target_id = node_children[parout.data('id')];
                    cy.add({ group: 'edges', data: { id: `${child_id}->${target_id}`, source: child_id, target: target_id } });
                }
            });
        } else if (ln == 3) {
            // links to the children of parent incomers
            parent_incomers.forEach(parin => {
                // the below loop won't be used if this parent incomer has no children
                if (parin.data('id') in node_children) {
                    var target_id = node_children[parin.data('id')];
                    cy.add({ group: 'edges', data: { id: `${child_id}->${target_id}`, source: child_id, target: target_id } });
                }
            });
        }
    });
    // CHANGE NODE STATES
    Object.entries(new_states).forEach(([nd_id, state]) => {
        cy.nodes('#' + nd_id).data('state', state);
    });
    console.log(document.getElementById('anim-2step').checked)
    if (document.getElementById('anim-2step').checked) {
        // do the layout before removing the deleted nodes so that we can fade them out.
        var lay = cy.layout({
            name: 'fcose', //'cola'
            randomize: false
        })
        lay.promiseOn('layoutstop').then(evt => { // what to do once the layout has finished running
            // remove "splitting" indicator from nodes
            Object.keys(split_flags).forEach(nd_id => {
                cy.nodes('#' + nd_id).data('splitting', 0);
            });
            // REMOVE DELETED NODES
            to_remove.forEach(nd_id => {
                cy.nodes('#' + nd_id).remove();
            });
            redoLayout(false);
        })
        lay.run();
    } else {
        // remove "splitting" indicator from nodes
        Object.keys(split_flags).forEach(nd_id => {
            cy.nodes('#' + nd_id).data('splitting', 0);
        });
        // REMOVE DELETED NODES
        to_remove.forEach(nd_id => {
            cy.nodes('#' + nd_id).remove();
        });
        redoLayout(false);
    }
    //refreshTooltips();
    refreshEvents();

}

function argMax(vec) {
    // NumJS doesn't seem to have argmax
    // got this from: https://gist.github.com/engelen/fbce4476c9e68c52ff7e5c2da5c24a28
    var array = vec.tolist() // convert to a native JS list.
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}

// TODO: I wonder if I could do it all in one go as in the python code.
// Can I convert between cytoscape and adjacency matrix.
// Doesn't seem to be any cytoscape function to do this. Could write my own?

function stepForward() {
    if (('next' in cy.data()) && (cy.data('next') != null)) {
        //shortcut if we have already done a step back, we don't need to recalculate.
        console.log('Next step already calculated');
        // because cy.json(...) only updates the specified fields if the 'next' json has no 'next' field of its own
        // it will continue to reference *this* next json. So then we need to manually remove the field.
        console.log(cy.data());
        var has_next_next = (('next' in cy.data('next')) && (cy.data('next')['next'] != null));
        cy.json(cy.data('next'));
        if (!has_next_next) {
            cy.data('next', null);
        }
    } else {
        console.log('Calculating next step');
        dgcaStep();
    }
}

function stepBack() {
    var next = cy.json(); // save current graph 
    cy.json(cy.data('prev')); // revert to previous step
    cy.data('next', next); // attach current graph in "next" attrib so we don't have to recalculate if we step forward.
    cy.nodes().forEach(nd => {
        nd.data('splitting', 0);
        nd.data('deleting', 0);
    });
    redoLayout(false);
}