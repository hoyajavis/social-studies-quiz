import { Question } from "./types";
import { CHAPTER_1_QUESTIONS } from "./data/chapter1";

export const CHAPTERS = [
  { id: "chapter1", name: "Chapter 1: Foundations", questions: CHAPTER_1_QUESTIONS }
];

export const INITIAL_QUESTIONS: Question[] = CHAPTER_1_QUESTIONS;
