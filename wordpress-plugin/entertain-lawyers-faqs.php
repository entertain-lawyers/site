<?php
/**
 * Plugin Name: Entertain Lawyers FAQs
 * Plugin URI:  https://entertainlawyers.com/
 * Description: Registers a Custom Post Type for FAQs with REST API support to sync with the Next.js frontend.
 * Version:     1.0.0
 * Author:      Entertain Lawyers
 * License:     GPL2
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

namespace EntertainLawyers\FAQs;

/**
 * Register the FAQ Custom Post Type.
 */
function register_faq_cpt() {
    $labels = array(
        'name'                  => _x( 'FAQs', 'Post Type General Name', 'entertain-lawyers' ),
        'singular_name'         => _x( 'FAQ', 'Post Type Singular Name', 'entertain-lawyers' ),
        'menu_name'             => __( 'FAQs', 'entertain-lawyers' ),
        'name_admin_bar'        => __( 'FAQ', 'entertain-lawyers' ),
        'archives'              => __( 'FAQ Archives', 'entertain-lawyers' ),
        'attributes'            => __( 'FAQ Attributes', 'entertain-lawyers' ),
        'parent_item_colon'     => __( 'Parent FAQ:', 'entertain-lawyers' ),
        'all_items'             => __( 'All FAQs', 'entertain-lawyers' ),
        'add_new_item'          => __( 'Add New FAQ', 'entertain-lawyers' ),
        'add_new'               => __( 'Add New', 'entertain-lawyers' ),
        'new_item'              => __( 'New FAQ', 'entertain-lawyers' ),
        'edit_item'             => __( 'Edit FAQ', 'entertain-lawyers' ),
        'update_item'           => __( 'Update FAQ', 'entertain-lawyers' ),
        'view_item'             => __( 'View FAQ', 'entertain-lawyers' ),
        'view_items'            => __( 'View FAQs', 'entertain-lawyers' ),
        'search_items'          => __( 'Search FAQ', 'entertain-lawyers' ),
        'not_found'             => __( 'Not found', 'entertain-lawyers' ),
        'not_found_in_trash'    => __( 'Not found in Trash', 'entertain-lawyers' ),
        'featured_image'        => __( 'Featured Image', 'entertain-lawyers' ),
        'set_featured_image'    => __( 'Set featured image', 'entertain-lawyers' ),
        'remove_featured_image' => __( 'Remove featured image', 'entertain-lawyers' ),
        'use_featured_image'    => __( 'Use as featured image', 'entertain-lawyers' ),
        'insert_into_item'      => __( 'Insert into FAQ', 'entertain-lawyers' ),
        'uploaded_to_this_item' => __( 'Uploaded to this FAQ', 'entertain-lawyers' ),
        'items_list'            => __( 'FAQs list', 'entertain-lawyers' ),
        'items_list_navigation' => __( 'FAQs list navigation', 'entertain-lawyers' ),
        'filter_items_list'     => __( 'Filter FAQs list', 'entertain-lawyers' ),
    );

    $args = array(
        'label'                 => __( 'FAQ', 'entertain-lawyers' ),
        'description'           => __( 'Frequently Asked Questions', 'entertain-lawyers' ),
        'labels'                => $labels,
        'supports'              => array( 'title', 'editor', 'page-attributes' ),
        'hierarchical'          => false,
        'public'                => true,
        'show_ui'               => true,
        'show_in_menu'          => true,
        'menu_position'         => 20,
        'menu_icon'             => 'dashicons-editor-help',
        'show_in_admin_bar'     => true,
        'show_in_nav_menus'     => false,
        'can_export'            => true,
        'has_archive'           => false,
        'exclude_from_search'   => true,
        'publicly_queryable'    => true,
        'show_in_rest'          => true, // Essential: Exposes to wp-json/wp/v2/faq
        'rest_base'             => 'faq',
    );

    register_post_type( 'faq', $args );
}

add_action( 'init', __NAMESPACE__ . '\register_faq_cpt', 0 );
